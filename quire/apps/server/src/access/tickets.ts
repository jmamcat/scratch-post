import { newSecret } from './tokens.ts';

/** Outstanding tickets are capped so a client looping on `POST /api/tickets` cannot grow memory. */
const MAX_TICKETS = 10_000;

/**
 * Single-use tickets for event streams and live connections (R-ACC-03): the URL of such a
 * connection carries a ticket, never the token. In memory only; a restart voids them all,
 * and clients fetch a fresh one for every connection anyway.
 */
export class Tickets {
  private readonly open = new Map<string, { name: string; expiresAt: number }>();

  constructor(private readonly ttlMs: number) {}

  issue(name: string): { ticket: string; expiresAt: string } {
    if (this.open.size >= MAX_TICKETS) this.open.delete(this.open.keys().next().value!);
    const ticket = newSecret();
    const expiresAt = Date.now() + this.ttlMs;
    this.open.set(ticket, { name, expiresAt });
    return { ticket, expiresAt: new Date(expiresAt).toISOString() };
  }

  /** The token name the ticket was issued to, or null; a ticket works once. */
  redeem(ticket: string): string | null {
    const t = this.open.get(ticket);
    if (!t) return null;
    this.open.delete(ticket);
    return t.expiresAt > Date.now() ? t.name : null;
  }

  voidFor(name: string): void {
    for (const [k, t] of this.open) if (t.name === name) this.open.delete(k);
  }

  sweep(now = Date.now()): void {
    for (const [k, t] of this.open) if (t.expiresAt <= now) this.open.delete(k);
  }
}
