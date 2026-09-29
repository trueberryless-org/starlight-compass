import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";

const TRUTHY_VALUES = new Set(["1", "true", "yes"]);

/**
 * Loads environment variables the way Vite does, as Astro does not expose `.env` files to integrations.
 * Variables set in the shell take precedence over `.env` files.
 *
 * @see https://vite.dev/guide/env-and-mode.html#env-files
 */
export function loadEnv(
  root: URL,
  mode: string,
  processEnv: NodeJS.ProcessEnv
): CompassEnv {
  const env: CompassEnv = Object.create(null);

  for (const file of [
    ".env",
    ".env.local",
    `.env.${mode}`,
    `.env.${mode}.local`,
  ]) {
    Object.assign(env, readEnvFile(new URL(file, root)));
  }

  return Object.assign(env, processEnv);
}

export function isAuditRequested(env: CompassEnv): boolean {
  return TRUTHY_VALUES.has(env["STARLIGHT_COMPASS_AUDIT"]?.toLowerCase() ?? "");
}

function readEnvFile(url: URL) {
  try {
    return parseEnv(readFileSync(fileURLToPath(url), "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw error;
  }
}

export type CompassEnv = Record<string, string | undefined>;
