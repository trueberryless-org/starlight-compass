import type { StarlightPlugin } from "@astrojs/starlight/types";

import { runAudit } from "./libs/audit";
import {
  type StarlightCompassConfig,
  type StarlightCompassUserConfig,
  validateConfig,
} from "./libs/config";
import { isAuditRequested, loadEnv } from "./libs/env";
import { throwPluginError } from "./libs/error";
import { getCompassPages } from "./libs/store";
import { TOOLBAR_APP_ID, setupToolbarServer } from "./libs/toolbar";

export { typesafe } from "./providers/typesafe";
export { diataxis } from "./rules/diataxis";

export type { StarlightCompassConfig, StarlightCompassUserConfig };
export type {
  CompassAnswer,
  CompassClient,
  CompassProvider,
  CompassProviderContext,
  CompassQuestion,
  CompassRequest,
  CompassResponse,
} from "./libs/provider";
export type {
  CompassFinding,
  CompassFindingLevel,
  CompassPage,
  CompassRule,
  CompassRuleResult,
} from "./libs/rule";
export type { TypesafeOptions } from "./providers/typesafe";
export type { DiataxisOptions, DiataxisType } from "./rules/diataxis";

const TOOLBAR_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/></svg>';

export default function starlightCompass(
  userConfig?: StarlightCompassUserConfig
): StarlightPlugin {
  const config = validateConfig(userConfig);

  return {
    name: "starlight-compass",
    hooks: {
      "config:setup"({
        addIntegration,
        addRouteMiddleware,
        astroConfig,
        command,
        logger,
      }) {
        if (command !== "dev" && command !== "build") return;

        const env = loadEnv(
          astroConfig.root,
          command === "dev" ? "development" : "production",
          process.env
        );
        const isAudit = command === "build" && isAuditRequested(env);
        const isDevToolbar = command === "dev" && config.devToolbar;
        if (!isAudit && !isDevToolbar) return;

        const client = config.provider.createClient({ env });
        if (!client) {
          const message = `No \`${config.provider.name}\` provider is configured. ${config.provider.setupHint}`;
          if (isAudit)
            throwPluginError(
              "Cannot run the starlight-compass audit.",
              message
            );

          logger.info(
            `The starlight-compass dev toolbar app is disabled. ${message}`
          );
          return;
        }

        addRouteMiddleware({ entrypoint: "starlight-compass/middleware" });

        addIntegration({
          name: "starlight-compass-integration",
          hooks: {
            "astro:config:setup"({ addDevToolbarApp }) {
              if (!isDevToolbar) return;

              addDevToolbarApp({
                entrypoint: "starlight-compass/toolbar",
                icon: TOOLBAR_ICON,
                id: TOOLBAR_APP_ID,
                name: "Compass",
              });
            },
            "astro:server:setup"({ logger: integrationLogger, toolbar }) {
              setupToolbarServer(toolbar, {
                cacheDir: astroConfig.cacheDir,
                client,
                config,
                logger: integrationLogger,
              });
            },
            async "astro:build:done"({ logger: integrationLogger }) {
              if (!isAudit) return;

              await runAudit([...getCompassPages().values()], {
                cacheDir: astroConfig.cacheDir,
                client,
                config,
                env,
                logger: integrationLogger,
                root: astroConfig.root,
              });
            },
          },
        });
      },
    },
  };
}
