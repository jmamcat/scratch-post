import type { Transport } from './client.ts';
import type { ChangeFeed, Conflict, ConflictStatus, DocMeta, PushRequest, PushResult, Resolution } from './protocol.ts';

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

/** fetch-based client for the Quire HTTP API. Works in browsers, WebViews and Node 22. */
export class HttpTransport implements Transport {
  constructor(
    readonly baseUrl: string,
    private readonly token?: string,
    private readonly fetchFn: typeof fetch = (...args) => globalThis.fetch(...args),
  ) {}

  push(req: PushRequest): Promise<PushResult[]> {
    return this.call('POST', '/api/sync/push', req);
  }

  changes(since: number): Promise<ChangeFeed> {
    return this.call('GET', `/api/sync/changes?since=${since}`);
  }

  doc(path: string, rev?: number): Promise<{ meta: DocMeta; text: string | null }> {
    const q = new URLSearchParams({ path, ...(rev === undefined ? {} : { rev: String(rev) }) });
    return this.call('GET', `/api/doc?${q}`);
  }

  /** Heads of every note that exists (newest revision per path). */
  docs(): Promise<DocMeta[]> {
    return this.call('GET', '/api/docs');
  }

  history(path: string): Promise<DocMeta[]> {
    return this.call('GET', `/api/history?${new URLSearchParams({ path })}`);
  }

  conflicts(status?: ConflictStatus): Promise<Conflict[]> {
    return this.call('GET', `/api/conflicts${status ? `?status=${status}` : ''}`);
  }

  resolve(id: string, r: Resolution): Promise<PushResult> {
    return this.call('POST', `/api/conflicts/${encodeURIComponent(id)}/resolve`, r);
  }

  dismiss(id: string): Promise<Conflict> {
    return this.call('POST', `/api/conflicts/${encodeURIComponent(id)}/dismiss`);
  }

  health(): Promise<{ ok: boolean; mode: string; device: string; rev: number }> {
    return this.call('GET', '/api/health');
  }

  /** URL with the token as a query parameter, for EventSource and WebSocket. */
  url(path: string, params: Record<string, string> = {}): string {
    const q = new URLSearchParams({ ...params, ...(this.token ? { token: this.token } : {}) });
    const s = q.toString();
    return `${this.baseUrl}${path}${s ? `?${s}` : ''}`;
  }

  private async call<T>(method: string, path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = {};
    if (body !== undefined) headers['content-type'] = 'application/json';
    if (this.token) headers.authorization = `Bearer ${this.token}`;
    const res = await this.fetchFn(`${this.baseUrl}${path}`, {
      method,
      headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (!res.ok) {
      let message = res.statusText;
      try {
        message = ((await res.json()) as { error?: string }).error ?? message;
      } catch {
        // keep statusText
      }
      throw new HttpError(res.status, message);
    }
    return (await res.json()) as T;
  }
}
