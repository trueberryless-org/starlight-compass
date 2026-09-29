import type { CompassPage } from "./rule";

/**
 * Pages rendered by Starlight, recorded by the route middleware and read by the integration hooks.
 * The middleware runs in a different module graph than the integration, so the store lives on `globalThis`.
 */
export function getCompassPages(): Map<string, CompassPage> {
  globalThis.__starlightCompassPages ??= new Map();

  return globalThis.__starlightCompassPages;
}

export function addCompassPage(page: CompassPage) {
  getCompassPages().set(page.pathname, page);
}

declare global {
  var __starlightCompassPages: Map<string, CompassPage> | undefined;
}
