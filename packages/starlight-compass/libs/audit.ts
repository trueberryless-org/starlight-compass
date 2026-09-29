import type { AstroIntegrationLogger } from "astro";

import { runReporters } from "../reporters";
import { cliReporter, logStep } from "../reporters/cli";
import { gitHubActionsReporter } from "../reporters/github-actions";
import { readCompassCache, writeCompassCache } from "./cache";
import type { StarlightCompassConfig } from "./config";
import { throwPluginError } from "./error";
import type { CompassClient } from "./provider";
import { getAuditReport } from "./report";
import { type CompassReview, reviewPage } from "./review";
import type { CompassPage } from "./rule";

const CONCURRENCY = 4;

export async function runAudit(pages: CompassPage[], context: AuditContext) {
  const { cacheDir, client, config, env, logger, root } = context;

  logStep("auditing documentation");

  const cache = await readCompassCache(cacheDir);
  const sortedPages = pages.toSorted((a, b) =>
    a.pathname.localeCompare(b.pathname)
  );

  let reviews: CompassReview[];
  try {
    reviews = await mapWithConcurrency(sortedPages, CONCURRENCY, (page) =>
      reviewPage(page, { cache, client, rules: config.rules })
    );
  } finally {
    await writeCompassCache(cacheDir, cache);
  }

  const report = getAuditReport(reviews, {
    failOn: config.audit.failOn,
    root,
  });

  if (report.isFailing) {
    logger.error("Documentation audit failed.");
  } else if (report.files.length > 0) {
    logger.warn(
      `Documentation audit found issues, but the build will continue (\`failOn: "${config.audit.failOn}"\`).`
    );
  }

  await runReporters([cliReporter, gitHubActionsReporter], report, {
    env,
    logger,
  });

  if (report.isFailing) {
    throwPluginError(
      "Documentation audit failed.",
      "Fix the findings listed above, or change the `audit.failOn` option."
    );
  }
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  callback: (item: T) => Promise<R>
) {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function work() {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await callback(items[index] as T);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, work)
  );

  return results;
}

interface AuditContext {
  cacheDir: URL;
  client: CompassClient;
  config: StarlightCompassConfig;
  env: Record<string, string | undefined>;
  logger: AstroIntegrationLogger;
  root: URL;
}
