import type { IncomingMessage, Server } from 'node:http';
import type { Duplex } from 'node:stream';
import { InvalidPathError, merge3, normalizePath } from '@quire/core';
import type { DocMeta, RevisionStore, SyncServer } from '@quire/sync';
import diff from 'fast-diff';
import * as decoding from 'lib0/decoding';
import * as encoding from 'lib0/encoding';
import { type WebSocket, WebSocketServer } from 'ws';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as syncProtocol from 'y-protocols/sync';
import * as Y from 'yjs';
import { sha256 } from '../shared/hash.ts';

/** What live rooms need from the server they run in. */
export interface LiveDeps {
  store: RevisionStore;
  sync: SyncServer;
  token?: string | undefined;
  hooks: {
    beforeWrite: Set<(path: string) => void>;
    afterWrite: Set<(path: string, text: string | null, meta: DocMeta) => void>;
  };
  /** Mirror and announce a commit the rooms wrote straight to the store. */
  committed(path: string, text: string | null, meta: DocMeta): void;
}

const MESSAGE_SYNC = 0;
const MESSAGE_AWARENESS = 1;
const SERVER_ORIGIN = Symbol('quire-server');

export interface LiveRooms {
  attach(server: Server): void;
  /** Commit a room's pending text now. Must run inside SyncServer.exclusive or a push. */
  flush(path: string): void;
  /** Bring a room to a new head text without losing live edits. */
  apply(path: string, text: string | null, meta: DocMeta): void;
  activePaths(): string[];
  close(): Promise<void>;
}

interface Room {
  path: string;
  doc: Y.Doc;
  text: Y.Text;
  awareness: awarenessProtocol.Awareness;
  conns: Map<WebSocket, Set<number>>;
  /** Revision and text the room last agreed with the revision log. */
  baseRev: number | null;
  committedText: string;
  idleTimer: NodeJS.Timeout | null;
  firstPendingAt: number | null;
}

/** Yjs rooms speaking the y-websocket protocol (R-LIV-01..03). */
export function createLiveRooms(q: LiveDeps, opts: { idleMs?: number; maxMs?: number } = {}): LiveRooms {
  const idleMs = opts.idleMs ?? 1500;
  const maxMs = opts.maxMs ?? 10_000;
  const rooms = new Map<string, Room>();
  const wss = new WebSocketServer({ noServer: true });

  function getRoom(path: string): Room {
    const existing = rooms.get(path);
    if (existing) return existing;
    const doc = new Y.Doc();
    const text = doc.getText('content');
    const head = q.store.head(path);
    const initial = head && !head.deleted ? (q.store.text(head.rev) ?? '') : '';
    doc.transact(() => text.insert(0, initial), SERVER_ORIGIN);
    const room: Room = {
      path,
      doc,
      text,
      awareness: new awarenessProtocol.Awareness(doc),
      conns: new Map(),
      baseRev: head?.rev ?? null,
      committedText: initial,
      idleTimer: null,
      firstPendingAt: null,
    };
    room.awareness.setLocalState(null);

    doc.on('update', (update: Uint8Array, origin: unknown) => {
      const enc = encoding.createEncoder();
      encoding.writeVarUint(enc, MESSAGE_SYNC);
      syncProtocol.writeUpdate(enc, update);
      broadcast(room, encoding.toUint8Array(enc));
      if (origin !== SERVER_ORIGIN) schedule(room);
    });

    room.awareness.on('update', ({ added, updated, removed }: { added: number[]; updated: number[]; removed: number[] }, conn: unknown) => {
      const changed = [...added, ...updated, ...removed];
      if (conn && room.conns.has(conn as WebSocket)) {
        const ids = room.conns.get(conn as WebSocket)!;
        for (const id of added) ids.add(id);
        for (const id of removed) ids.delete(id);
      }
      const enc = encoding.createEncoder();
      encoding.writeVarUint(enc, MESSAGE_AWARENESS);
      encoding.writeVarUint8Array(enc, awarenessProtocol.encodeAwarenessUpdate(room.awareness, changed));
      broadcast(room, encoding.toUint8Array(enc));
    });

    rooms.set(path, room);
    return room;
  }

  function broadcast(room: Room, msg: Uint8Array): void {
    for (const ws of room.conns.keys()) send(ws, msg);
  }

  function send(ws: WebSocket, msg: Uint8Array): void {
    if (ws.readyState === ws.OPEN) ws.send(msg, (err) => err && ws.close());
  }

  function schedule(room: Room): void {
    const now = Date.now();
    room.firstPendingAt ??= now;
    if (room.idleTimer) clearTimeout(room.idleTimer);
    const wait = Math.max(0, Math.min(idleMs, room.firstPendingAt + maxMs - now));
    room.idleTimer = setTimeout(() => {
      room.idleTimer = null;
      void q.sync.exclusive(() => flushRoom(room));
    }, wait);
  }

  /** Synchronous commit of the room's text; callers hold the SyncServer queue. */
  function flushRoom(room: Room): void {
    if (room.idleTimer) clearTimeout(room.idleTimer);
    room.idleTimer = null;
    room.firstPendingAt = null;
    const live = room.text.toString();
    if (live === room.committedText) return;

    const head = q.store.head(room.path);
    let text = live;
    if (head && head.rev !== room.baseRev) {
      // The log moved without the room hearing about it: merge rather than overwrite.
      const headText = head.deleted ? '' : (q.store.text(head.rev) ?? '');
      text = merge3(room.committedText, headText, live).text;
    }
    const meta = q.store.commit(room.path, text, 'live', sha256(text));
    room.baseRev = meta.rev;
    room.committedText = text;
    if (text !== live) setRoomText(room, text);
    q.committed(room.path, text, meta);
  }

  function setRoomText(room: Room, next: string): void {
    const cur = room.text.toString();
    if (cur === next) return;
    room.doc.transact(() => {
      let pos = 0;
      for (const [op, chunk] of diff(cur, next)) {
        if (op === diff.EQUAL) pos += chunk.length;
        else if (op === diff.DELETE) room.text.delete(pos, chunk.length);
        else {
          room.text.insert(pos, chunk);
          pos += chunk.length;
        }
      }
    }, SERVER_ORIGIN);
  }

  const rooms_: LiveRooms = {
    attach(server: Server) {
      server.on('upgrade', (req: IncomingMessage, socket: Duplex, head: Buffer) => {
        const url = new URL(req.url ?? '/', 'http://localhost');
        if (url.pathname !== '/live' && url.pathname !== '/live/') return;
        if (q.token && url.searchParams.get('token') !== q.token) {
          socket.end('HTTP/1.1 401 Unauthorized\r\n\r\n');
          return;
        }
        let path: string;
        try {
          path = normalizePath(url.searchParams.get('path') ?? '');
        } catch (e) {
          if (!(e instanceof InvalidPathError)) throw e;
          socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
          return;
        }
        wss.handleUpgrade(req, socket, head, (ws) => connect(ws, path));
      });
    },

    flush(path) {
      const room = rooms.get(path);
      if (room) flushRoom(room);
    },

    apply(path, text, meta) {
      const room = rooms.get(path);
      if (!room || meta.rev === room.baseRev) return;
      const next = text ?? '';
      const live = room.text.toString();
      // Live typing wins overlapping hunks; the other version stays in the revision log.
      const merged = live === room.committedText ? next : merge3(room.committedText, live, next).text;
      room.baseRev = meta.rev;
      room.committedText = next;
      setRoomText(room, merged);
      if (merged !== next) schedule(room);
    },

    activePaths: () => [...rooms.keys()],

    async close() {
      await q.sync.exclusive(() => {
        for (const room of rooms.values()) flushRoom(room);
      });
      for (const room of rooms.values()) {
        for (const ws of room.conns.keys()) ws.terminate();
        room.doc.destroy();
      }
      rooms.clear();
      wss.close();
    },
  };

  function connect(ws: WebSocket, path: string): void {
    ws.binaryType = 'arraybuffer';
    const room = getRoom(path);
    room.conns.set(ws, new Set());

    ws.on('message', (data: ArrayBuffer | Buffer) => {
      try {
        const msg = data instanceof ArrayBuffer ? new Uint8Array(data) : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
        const dec = decoding.createDecoder(msg);
        const enc = encoding.createEncoder();
        const type = decoding.readVarUint(dec);
        if (type === MESSAGE_SYNC) {
          encoding.writeVarUint(enc, MESSAGE_SYNC);
          syncProtocol.readSyncMessage(dec, enc, room.doc, ws);
          if (encoding.length(enc) > 1) send(ws, encoding.toUint8Array(enc));
        } else if (type === MESSAGE_AWARENESS) {
          awarenessProtocol.applyAwarenessUpdate(room.awareness, decoding.readVarUint8Array(dec), ws);
        }
      } catch {
        ws.close();
      }
    });

    ws.on('close', () => {
      const ids = room.conns.get(ws);
      room.conns.delete(ws);
      if (ids?.size) awarenessProtocol.removeAwarenessStates(room.awareness, [...ids], null);
      if (room.conns.size === 0) {
        void q.sync.exclusive(() => {
          if (room.conns.size > 0) return;
          flushRoom(room);
          room.doc.destroy();
          rooms.delete(path);
        });
      }
    });

    const enc = encoding.createEncoder();
    encoding.writeVarUint(enc, MESSAGE_SYNC);
    syncProtocol.writeSyncStep1(enc, room.doc);
    send(ws, encoding.toUint8Array(enc));
    const states = room.awareness.getStates();
    if (states.size > 0) {
      const aw = encoding.createEncoder();
      encoding.writeVarUint(aw, MESSAGE_AWARENESS);
      encoding.writeVarUint8Array(aw, awarenessProtocol.encodeAwarenessUpdate(room.awareness, [...states.keys()]));
      send(ws, encoding.toUint8Array(aw));
    }
  }

  q.hooks.beforeWrite.add((path) => rooms_.flush(path));
  q.hooks.afterWrite.add((path, text, meta) => rooms_.apply(path, text, meta));
  return rooms_;
}
