/**
 * Offline app start (R-PLT-06): a service worker caches the app shell so the app starts with
 * no network, and a new version waits behind a "Reload to update" prompt. The build plugin
 * (`plugin.ts`) is for vite.config.ts only and is not part of this entry.
 */
export { registerOffline } from './register.ts';
export { UpdatePrompt } from './UpdatePrompt.tsx';
