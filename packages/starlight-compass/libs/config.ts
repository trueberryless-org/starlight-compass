import { z } from "astro/zod";

import { typesafe } from "../providers/typesafe";
import { diataxis } from "../rules/diataxis";
import { throwPluginError } from "./error";
import type { CompassProvider } from "./provider";
import type { CompassRule } from "./rule";

const providerSchema = z.custom<CompassProvider>(
  (value) =>
    isObjectWith(value, "name", "string") &&
    isObjectWith(value, "createClient", "function"),
  { message: "Expected a provider, e.g. `typesafe()`." }
);

const ruleSchema = z.custom<CompassRule>(
  (value) =>
    isObjectWith(value, "name", "string") &&
    isObjectWith(value, "getQuestions", "function") &&
    isObjectWith(value, "getResult", "function"),
  { message: "Expected a rule, e.g. `diataxis()`." }
);

const configSchema = z
  .object({
    /**
     * Settings for audits, which review every page at the end of a build run with the `STARLIGHT_COMPASS_AUDIT=1`
     * environment variable.
     *
     * @see https://starlight-compass.netlify.app/guides/audit-in-ci/
     */
    audit: z
      .object({
        /**
         * The finding level that fails the audit.
         *
         * @default "error"
         */
        failOn: z.enum(["error", "warning", "never"]).default("error"),
      })
      .prefault({}),
    /**
     * Whether to review the current page in the Astro dev toolbar during development.
     * Requires a configured provider, e.g. a `TYPESAFE_API_KEY` environment variable.
     *
     * @default true
     */
    devToolbar: z.boolean().default(true),
    /**
     * The provider answering the questions of every rule.
     *
     * @default typesafe()
     * @see https://starlight-compass.netlify.app/reference/providers/
     */
    provider: providerSchema.default(() => typesafe()),
    /**
     * The rules reviewing every page.
     *
     * @default [diataxis()]
     * @see https://starlight-compass.netlify.app/reference/rules/
     */
    rules: z
      .array(ruleSchema)
      .default(() => [diataxis()])
      .refine(
        (rules) =>
          new Set(rules.map((rule) => rule.name)).size === rules.length,
        {
          message: "Every rule must have a unique name.",
        }
      ),
  })
  .prefault({});

export function validateConfig(userConfig: unknown): StarlightCompassConfig {
  const config = configSchema.safeParse(userConfig);

  if (!config.success) {
    throwPluginError(`Invalid starlight-compass configuration:

${z.prettifyError(config.error)}
`);
  }

  return config.data;
}

function isObjectWith(
  value: unknown,
  key: string,
  type: "function" | "string"
) {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Record<string, unknown>)[key] === type
  );
}

export type StarlightCompassUserConfig = z.input<typeof configSchema>;
export type StarlightCompassConfig = z.output<typeof configSchema>;
