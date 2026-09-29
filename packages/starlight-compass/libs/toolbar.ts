import type { AstroIntegrationLogger, HookParameters } from "astro";

import { readCompassCache, writeCompassCache } from "./cache";
import type { StarlightCompassConfig } from "./config";
import type { CompassClient } from "./provider";
import { type CompassReviewResult, reviewPage } from "./review";
import { getCompassPages } from "./store";

export const TOOLBAR_APP_ID = "starlight-compass";
export const TOOLBAR_REVIEW_EVENT = "starlight-compass:review";
export const TOOLBAR_RESULT_EVENT = "starlight-compass:result";

export function setupToolbarServer(
  toolbar: ToolbarServer,
  context: ToolbarServerContext
) {
  const { cacheDir, client, config, logger } = context;

  const cache = readCompassCache(cacheDir);

  toolbar.on<ToolbarReviewPayload>(
    TOOLBAR_REVIEW_EVENT,
    async ({ pathname }) => {
      const page = getCompassPages().get(pathname);
      if (!page) {
        toolbar.send<ToolbarResultPayload>(TOOLBAR_RESULT_EVENT, {
          pathname,
          status: "unavailable",
        });
        return;
      }

      try {
        const review = await reviewPage(page, {
          cache: await cache,
          client,
          rules: config.rules,
        });
        await writeCompassCache(cacheDir, await cache);

        toolbar.send<ToolbarResultPayload>(TOOLBAR_RESULT_EVENT, {
          filePath: page.filePath,
          model: review.model,
          pathname,
          results: review.results,
          status: "reviewed",
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.warn(`Failed to review \`${pathname}\`: ${message}`);
        toolbar.send<ToolbarResultPayload>(TOOLBAR_RESULT_EVENT, {
          message,
          pathname,
          status: "error",
        });
      }
    }
  );
}

type ToolbarServer = HookParameters<"astro:server:setup">["toolbar"];

interface ToolbarServerContext {
  cacheDir: URL;
  client: CompassClient;
  config: StarlightCompassConfig;
  logger: AstroIntegrationLogger;
}

export interface ToolbarReviewPayload {
  pathname: string;
}

export type ToolbarResultPayload =
  | { message: string; pathname: string; status: "error" }
  | { pathname: string; status: "unavailable" }
  | {
      filePath: string | undefined;
      model: string | undefined;
      pathname: string;
      results: CompassReviewResult[];
      status: "reviewed";
    };
