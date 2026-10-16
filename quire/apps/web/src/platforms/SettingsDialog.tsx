import { HttpTransport } from '@quire/sync';
import { useState } from 'react';
import { type Settings, trimUrl } from './settings.ts';
import { Modal } from '../shared/Modal.tsx';

interface Props {
  settings: Settings;
  pending: number;
  onSave: (s: Settings) => void;
  onClose: () => void;
}

/** Server URL, token and device name (R-PLT-03). Saving reloads the client. */
export function SettingsDialog({ settings, pending, onSave, onClose }: Props) {
  const [serverUrl, setServerUrl] = useState(settings.serverUrl);
  const [token, setToken] = useState(settings.token);
  const [device, setDevice] = useState(settings.device);
  const [check, setCheck] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const urlOk = /^https?:\/\/[^\s/]+/.test(trimUrl(serverUrl));
  const changedServer = trimUrl(serverUrl) !== settings.serverUrl;

  const test = async () => {
    setBusy(true);
    setCheck(null);
    try {
      const t = new HttpTransport(trimUrl(serverUrl), token || undefined);
      const h = await t.health();
      // Health is public; an authenticated call checks the token too.
      await t.changes(h.rev);
      setCheck({ ok: true, text: `Connected to ${h.device} (${h.mode} server, revision ${h.rev}).` });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setCheck({ ok: false, text: /unauthorized/i.test(msg) ? 'The server needs a valid token.' : `Could not reach the server: ${msg}` });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal label="Settings" onClose={onClose} className="settings">
      <h2>Settings</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!urlOk || !device.trim()) return;
          onSave({ serverUrl: trimUrl(serverUrl), token: token.trim(), device: device.trim() });
        }}
      >
        <label className="field">
          <span>Server URL</span>
          <input value={serverUrl} onChange={(e) => setServerUrl(e.target.value)} inputMode="url" autoComplete="url" spellCheck={false} placeholder="https://quire.example.com" />
          {!urlOk && <small className="field-error">Enter an http:// or https:// address.</small>}
        </label>
        <label className="field">
          <span>Token</span>
          <input value={token} onChange={(e) => setToken(e.target.value)} type="password" autoComplete="off" placeholder="Leave empty if the server has none" />
        </label>
        <label className="field">
          <span>Device name</span>
          <input value={device} onChange={(e) => setDevice(e.target.value)} autoComplete="off" spellCheck={false} />
          <small className="muted">Shown in version history, conflicts and live cursors.</small>
        </label>
        {changedServer && (
          <p className="notice" role="note">
            Switching servers replaces this device's copy with the new server's notes.
            {pending > 0 ? ` ${pending} unsynced ${pending === 1 ? 'note is' : 'notes are'} kept and sent to the new server.` : ''}
          </p>
        )}
        {check && (
          <p className={check.ok ? 'notice ok' : 'notice error'} role="status">
            {check.text}
          </p>
        )}
        <div className="dialog-actions">
          <button type="button" onClick={test} disabled={busy || !urlOk}>
            {busy ? 'Testing...' : 'Test connection'}
          </button>
          <span className="spacer" />
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="primary" disabled={!urlOk || !device.trim()}>
            Save
          </button>
        </div>
      </form>
    </Modal>
  );
}
