import type { Browser, Locator, Page } from '@playwright/test';
import type { Device } from './device.ts';

/** Drives the web app in a browser context (@ui scenarios). Filled in once the app's UI lands. */
export abstract class BrowserDevice implements Device {
  static async open(_name: string, _url: string, _token: string | undefined, _browser: Browser): Promise<BrowserDevice> {
    throw new Error('the browser driver is not implemented yet');
  }
  abstract readonly name: string;
  abstract readonly page: Page;
  abstract reader(): Locator;
  abstract pane(name: 'Backlinks' | 'Outgoing' | 'Outline' | 'Properties'): Promise<Locator>;
  abstract open(path: string, opts?: { reading?: boolean }): Promise<void>;
  abstract search(query: string): Promise<void>;
  abstract runCommand(name: string): Promise<void>;
  abstract expectOpen(path: string): Promise<void>;
  abstract setText(path: string, text: string): Promise<void>;
  abstract append(path: string, text: string): Promise<void>;
  abstract replace(path: string, find: string, replacement: string): Promise<void>;
  abstract remove(path: string): Promise<void>;
  abstract read(path: string): Promise<string | undefined>;
  abstract isPending(path: string): Promise<boolean>;
  abstract sync(): Promise<void>;
  abstract goOffline(): Promise<void>;
  abstract comeOnline(): Promise<void>;
  abstract conflicts(): ReturnType<Device['conflicts']>;
  abstract resolve(...args: Parameters<Device['resolve']>): Promise<void>;
  abstract dismiss(id: string): Promise<void>;
  abstract close(): Promise<void>;
  abstract expectBadge(n: number): Promise<void>;
  abstract expectBanner(text: string): Promise<void>;
}
