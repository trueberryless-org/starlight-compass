import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { stripVTControlCharacters } from "node:util";

import type { AstroIntegrationLogger } from "astro";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { runAudit } from "../../libs/audit";
import { validateConfig } from "../../libs/config";
import { getTestClient, getTestPage } from "./utils";

const pages = [
  getTestPage({ data: { diataxis: "tutorial", title: "Deploy" } }),
  getTestPage({ data: { diataxis: "how-to", title: "Build" }, filePath: "src/content/docs/build.md", pathname: "/build/" }),
];

let cacheDir: URL;

describe("runAudit", () => {
  beforeEach(async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    cacheDir = pathToFileURL(`${await mkdtemp(join(tmpdir(), "starlight-compass-"))}/`);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(cacheDir, { force: true, recursive: true });
  });

  test("reports findings and fails on errors", async () => {
    const logger = getLogger();

    await expect(
      runAudit(pages, getContext({ config: validateConfig({}), logger }))
    ).rejects.toThrow("Documentation audit failed.");
    expect(logger.error).toHaveBeenCalledWith("Documentation audit failed.");
    expect(
      stripVTControlCharacters(vi.mocked(console.error).mock.calls.flat().join("\n"))
    ).toContain(
      "✗ | Declared as a tutorial but reads like a how-to guide (90% confidence)."
    );
  });

  test("does not fail when `failOn` is `never`", async () => {
    const config = validateConfig({ audit: { failOn: "never" } });

    await expect(runAudit(pages, getContext({ config }))).resolves.toBeUndefined();
  });

  test("persists responses between audits", async () => {
    const client = getTestClient();
    const config = validateConfig({ audit: { failOn: "never" } });

    await runAudit(pages, getContext({ client, config }));
    await runAudit(pages, getContext({ client, config }));

    expect(client.ask).toHaveBeenCalledTimes(2);
  });
});

function getContext(
  context: Pick<Parameters<typeof runAudit>[1], "config"> &
    Partial<Parameters<typeof runAudit>[1]>
): Parameters<typeof runAudit>[1] {
  return {
    cacheDir,
    client: getTestClient(),
    env: {},
    logger: getLogger(),
    root: new URL("file:///project/"),
    ...context,
  };
}

function getLogger() {
  return {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  } as unknown as AstroIntegrationLogger;
}
