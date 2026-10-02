import { describe, expect, test } from "vitest";

import { getConfigModule, getProviderModule, vitePluginAsk } from "../../libs/ask-route";
import { validateConfig } from "../../libs/config";
import { openaiCompatible } from "../../providers/openai-compatible";
import { typesafe } from "../../providers/typesafe";

describe("ask option", () => {
  test("is disabled by default", () => {
    expect(validateConfig({ provider: typesafe() }).ask).toBeUndefined();
    expect(validateConfig({ ask: false, provider: typesafe() }).ask).toBeUndefined();
  });

  test("applies defaults when enabled", () => {
    expect(validateConfig({ ask: true, provider: typesafe() }).ask).toEqual({
      maxPages: 3,
      minProbability: 0.3,
      rateLimit: 20,
      route: "/api/ask",
    });
    expect(validateConfig({ ask: { rateLimit: 0, route: "/ask" }, provider: typesafe() }).ask).toMatchObject({ rateLimit: 0, route: "/ask" });
  });

  test("rejects an invalid route", () => {
    expect(() => validateConfig({ ask: { route: "ask" }, provider: typesafe() })).toThrow("Invalid starlight-compass configuration");
  });
});

describe("virtual modules", () => {
  test("serializes the ask options", () => {
    const ask = validateConfig({ ask: true, provider: typesafe() }).ask!;

    expect(getConfigModule(ask)).toBe(
      'export const ask = {"maxPages":3,"minProbability":0.3,"rateLimit":20,"route":"/api/ask"};'
    );
  });

  test("recreates the provider with its options", () => {
    const code = getProviderModule(typesafe({ model: "jev-1.13.0" }));

    expect(code).toContain("providers/typesafe.ts");
    expect(code).toContain('export const provider = typesafe({"model":"jev-1.13.0"});');
    expect(getProviderModule(openaiCompatible({ baseUrl: "http://localhost:11434/v1" }))).toContain(
      'openaiCompatible({"baseUrl":"http://localhost:11434/v1"})'
    );
  });

  test("throws for providers that cannot be serialized", () => {
    expect(() => getProviderModule({ createClient: () => undefined, name: "custom", setupHint: "" })).toThrow(
      "cannot be used with the `ask` option"
    );
  });

  test("resolves and loads the modules", () => {
    const plugin = vitePluginAsk(validateConfig({ ask: true, provider: typesafe() }).ask!, typesafe());

    expect(plugin.resolveId("virtual:starlight-compass/ask-config")).toBe("\0virtual:starlight-compass/ask-config");
    expect(plugin.resolveId("other")).toBeUndefined();
    expect(plugin.load("\0virtual:starlight-compass/ask-provider")).toContain("typesafe");
  });
});
