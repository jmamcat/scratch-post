import type { Conflict, Resolution } from '@quire/sync';

/**
 * What a scenario can do with a device. Two drivers implement it: SystemDevice (a real
 * sync client over HTTP) for @system scenarios and BrowserDevice (the web app in a browser)
 * for @ui scenarios. Steps only talk to this interface.
 */
export interface Device {
  readonly name: string;
  setText(path: string, text: string): Promise<void>;
  append(path: string, text: string): Promise<void>;
  replace(path: string, find: string, replacement: string): Promise<void>;
  remove(path: string): Promise<void>;
  read(path: string): Promise<string | undefined>;
  isPending(path: string): Promise<boolean>;
  sync(): Promise<void>;
  goOffline(): Promise<void>;
  comeOnline(): Promise<void>;
  /** Open conflicts and review items as the server reports them to this device. */
  conflicts(): Promise<Conflict[]>;
  resolve(id: string, r: Omit<Resolution, 'device'>): Promise<void>;
  dismiss(id: string): Promise<void>;
  close(): Promise<void>;
}
