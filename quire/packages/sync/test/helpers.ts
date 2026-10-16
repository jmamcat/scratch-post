import { MemoryLocalStore, MemoryRevisionStore, SyncClient, SyncServer, memoryTransport, type ServerEvent } from '../src/index.ts';

export function setup() {
  const store = new MemoryRevisionStore();
  const events: ServerEvent[] = [];
  let n = 0;
  const server = new SyncServer(store, { onEvent: (e) => events.push(e), newId: () => `c${++n}` });
  const devices = new Map<string, { client: SyncClient; online: boolean }>();

  function device(name: string) {
    const entry = { client: undefined as unknown as SyncClient, online: true };
    entry.client = new SyncClient({
      store: new MemoryLocalStore(),
      transport: memoryTransport(server, { online: () => entry.online }),
      device: name,
    });
    devices.set(name, entry);
    return {
      client: entry.client,
      offline() {
        entry.online = false;
      },
      online() {
        entry.online = true;
      },
      async text(path: string) {
        return (await entry.client.store.get(path))?.text;
      },
    };
  }

  async function headText(path: string) {
    return server.doc(path).text;
  }

  return { store, server, events, device, headText };
}
