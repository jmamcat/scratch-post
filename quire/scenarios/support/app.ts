import { BrowserDevice } from './browser-device.ts';
import type { World } from './world.ts';

/** The browser device behind a name; UI-only steps use it (requirements with `Layer: ui`). */
export function appDevice(world: World, name: string): BrowserDevice {
  const d = world.device(name);
  if (!(d instanceof BrowserDevice)) throw new Error(`"${name}" is not a browser device; tag the requirement "Layer: ui"`);
  return d;
}
