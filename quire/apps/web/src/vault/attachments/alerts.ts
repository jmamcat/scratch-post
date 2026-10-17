import './attachments.css';

const SHOWN_MS = 8000;

/** Shows a message in a `role="alert"` element that goes away by itself. */
export function notify(message: string): void {
  let host = document.querySelector<HTMLElement>('.attachment-alerts');
  if (!host) {
    host = document.createElement('div');
    host.className = 'attachment-alerts';
    document.body.append(host);
  }
  const el = document.createElement('div');
  el.className = 'attachment-alert';
  el.setAttribute('role', 'alert');
  el.textContent = message;
  host.append(el);
  setTimeout(() => el.remove(), SHOWN_MS);
}
