import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import type { CompassRequest, CompassResponse } from "./provider";

const CACHE_VERSION = 1;

export async function readCompassCache(cacheDir: URL): Promise<CompassCache> {
  try {
    const cache = JSON.parse(
      await readFile(getCacheFilePath(cacheDir), "utf8")
    );
    if (cache.version === CACHE_VERSION)
      return new Map(Object.entries(cache.entries));
  } catch (error) {
    if (
      (error as NodeJS.ErrnoException).code !== "ENOENT" &&
      !(error instanceof SyntaxError)
    )
      throw error;
  }

  return new Map();
}

export async function writeCompassCache(cacheDir: URL, cache: CompassCache) {
  await mkdir(new URL("starlight-compass/", cacheDir), { recursive: true });
  await writeFile(
    getCacheFilePath(cacheDir),
    JSON.stringify({
      entries: Object.fromEntries(cache),
      version: CACHE_VERSION,
    })
  );
}

export function getCompassCacheKey(
  clientId: string,
  request: CompassRequest
): string {
  return createHash("sha256")
    .update(clientId)
    .update(JSON.stringify(request))
    .digest("hex");
}

function getCacheFilePath(cacheDir: URL) {
  return fileURLToPath(new URL("starlight-compass/cache.json", cacheDir));
}

export type CompassCache = Map<string, CompassResponse>;
