import type { ServerEvent } from '@quire/sync';

export interface EventStreamOptions {
  /** Full URL of `/api/events`, token included (see `HttpTransport.url`). */
  url: string;
  onEvent: (e: ServerEvent) => void;
  /** Called with true when the stream opens (or the server says hello) and false when it drops. */
  onStatus?: (connected: boolean) => void;
  /** Factory for tests and non-browser hosts. */
  createSource?: (url: string) => EventSource;
  minDelayMs?: number;
  maxDelayMs?: number;
}

/**
 * Server-Sent Events from `/api/events` with reconnect and exponential backoff.
 * The browser's own EventSource retry is not used, because it gives up on HTTP errors.
 */
export class EventStream {
  private source: EventSource | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private delay: number;
  private stopped = false;
  private connected = false;

  constructor(private readonly opts: EventStreamOptions) {
    this.delay = opts.minDelayMs ?? 1000;
  }

  get isConnected(): boolean {
    return this.connected;
  }

  start(): void {
    this.stopped = false;
    this.open();
  }

  stop(): void {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.source?.close();
    this.source = null;
    this.setConnected(false);
  }

  /** Reconnect now (for example on the window `online` event). */
  retryNow(): void {
    if (this.stopped || this.connected) return;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.open();
  }

  private open(): void {
    this.source?.close();
    const create = this.opts.createSource ?? ((u: string) => new EventSource(u));
    let es: EventSource;
    try {
      es = create(this.opts.url);
    } catch {
      this.scheduleRetry();
      return;
    }
    this.source = es;
    const up = () => {
      this.delay = this.opts.minDelayMs ?? 1000;
      this.setConnected(true);
    };
    es.onopen = up;
    es.addEventListener('hello', up);
    es.onmessage = (msg: MessageEvent<string>) => {
      try {
        this.opts.onEvent(JSON.parse(msg.data) as ServerEvent);
      } catch {
        // ignore malformed events
      }
    };
    es.onerror = () => {
      if (this.source !== es) return;
      es.close();
      this.source = null;
      this.setConnected(false);
      this.scheduleRetry();
    };
  }

  private scheduleRetry(): void {
    if (this.stopped || this.timer) return;
    const wait = this.delay;
    this.delay = Math.min(this.delay * 2, this.opts.maxDelayMs ?? 30_000);
    this.timer = setTimeout(() => {
      this.timer = null;
      if (!this.stopped) this.open();
    }, wait);
  }

  private setConnected(v: boolean): void {
    if (this.connected === v) return;
    this.connected = v;
    this.opts.onStatus?.(v);
  }
}
