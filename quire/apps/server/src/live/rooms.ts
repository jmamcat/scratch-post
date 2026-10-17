import type { IncomingMessage, Server } from 'node:http';
import type { Duplex } from 'node:stream';
import { merge3 } from '@quire/merge';
import { InvalidPathError, normalizePath } from '@quire/vault';
import type { DocMeta, RevisionStore, SyncServer } from '@quire/sync';
import * as decoding from 'lib0/decoding';
import * as encoding from 'lib0/encoding';
import { type WebSocket, WebSocketServer } from 'ws';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as syncProtocol from 'y-protocols/sync';
import * as Y from 'yjs';
import { sha256 } from '../shared/hash.ts';
import { replaceText } from './text.ts';

/** What live rooms need from the server they run in. */
export interface LiveDeps {
  store: RevisionStore;
  sync: SyncServer;
  /** Name of the token or ticket allowed to open this connection, or null to refuse (R-ACC-03). */
  authorize(url: URL, req: IncomingMessage): string | null;
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
  /** Close every connection opened with this token name (revocation, R-ACC-02). */
  closeConnections(tokenName: string): void;
  stats(): { rooms: number; connections: number };
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
  /** Device of the last connection that edited, named in the next commit (R-VLT-08). */
  lastDevice: string | null;
}

/** Yjs rooms speaking the y-websocket protocol (R-LIV-01..03). */
export function createLiveRooms(q: LiveDeps, opts: { idleMs?: number; maxMs?: number; maxTextBytes?: number } = {}): LiveRooms {
  const idleMs = opts.idleMs ?? 1500;
  const maxMs = opts.maxMs ?? 10_000;
  const maxTextBytes = opts.maxTextBytes ?? Number.POSITIVE_INFINITY;
  const rooms = new Map<string, Room>();
  const wss = new WebSocketServer({ noServer: true });
  const devices = new WeakMap<WebSocket, string>();
  const tokenNames = new Map<WebSocket, string>();

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
      lastDevice: null,
    };
    room.awareness.setLocalState(null);

    doc.on('update', (update: Uint8Array, origin: unknown) => {
      const enc = encoding.createEncoder();
      encoding.writeVarUint(enc, MESSAGE_SYNC);
      syncProtocol.writeUpdate(enc, update);
      broadcast(room, encoding.toUint8Array(enc));
      if (origin === SERVER_ORIGIN) return;
      room.lastDevice = devices.get(origin as WebSocket) ?? room.lastDevice;
      schedule(room);
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
    if (tooLarge(live)) {
      // Never commit past the limit (R-ACC-06); the message handler normally undoes it first.
      replaceText(room.doc, room.text, room.committedText, SERVER_ORIGIN);
      return;
    }

    const head = q.store.head(room.path);
    let text = live;
    if (head && head.rev !== room.baseRev) {
      // The log moved without the room hearing about it: merge rather than overwrite.
      const headText = head.deleted ? '' : (q.store.text(head.rev) ?? '');
      text = merge3(room.committedText, headText, live).text;
    }
    const meta = q.store.commit(room.path, text, room.lastDevice ?? 'live', sha256(text));
    room.baseRev = meta.rev;
    room.committedText = text;
    if (text !== live) replaceText(room.doc, room.text, text, SERVER_ORIGIN);
    q.committed(room.path, text, meta);
  }

  const tooLarge = (text: string) => Buffer.byteLength(text, 'utf8') > maxTextBytes;
  /** Whether a message could take the room over the limit: UTF-16 units are at most 3 bytes, inserts at most the message size. */
  const nearLimit = (room: Room, msgBytes: number) => room.text.length * 3 + msgBytes > maxTextBytes;

  const rooms_: LiveRooms = {
    attach(server: Server) {
      server.on('upgrade', (req: IncomingMessage, socket: Duplex, head: Buffer) => {
        const url = new URL(req.url ?? '/', 'http://localhost');
        if (url.pathname !== '/live' && url.pathname !== '/live/') return;
        const tokenName = q.authorize(url, req);
        if (tokenName === null) {
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
        const device = url.searchParams.get('device')?.trim().slice(0, 64) || null;
        wss.handleUpgrade(req, socket, head, (ws) => {
          if (device) devices.set(ws, device);
          tokenNames.set(ws, tokenName);
          ws.on('close', () => tokenNames.delete(ws));
          connect(ws, path);
        });
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
      replaceText(room.doc, room.text, merged, SERVER_ORIGIN);
      if (merged !== next) schedule(room);
    },

    activePaths: () => [...rooms.keys()],

    closeConnections(tokenName) {
      for (const [ws, name] of tokenNames) if (name === tokenName) ws.close(4401, 'token revoked');
    },

    stats: () => ({ rooms: rooms.size, connections: tokenNames.size }),

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
          const before = nearLimit(room, msg.byteLength) ? room.text.toString() : null;
          encoding.writeVarUint(enc, MESSAGE_SYNC);
          syncProtocol.readSyncMessage(dec, enc, room.doc, ws);
          if (before !== null && tooLarge(room.text.toString())) {
            // Undo it in the room so every device converges on the earlier text (R-ACC-06).
            replaceText(room.doc, room.text, before, SERVER_ORIGIN);
            ws.close(4413, 'note too large');
            return;
          }
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
