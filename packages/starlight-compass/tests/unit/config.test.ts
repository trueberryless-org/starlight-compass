import { describe, expect, test } from "vitest";

import { validateConfig } from "../../libs/config";
import { diataxis } from "../../rules/diataxis";

describe("validateConfig", () => {
  test("applies defaults", () => {
    const config = validateConfig(undefined);

    expect(config.audit).toEqual({ failOn: "error" });
    expect(config.devToolbar).toBe(true);
    expect(config.provider.name).toBe("typesafe");
    expect(config.rules.map((rule) => rule.name)).toEqual(["diataxis"]);
  });

  test("throws on an invalid provider", () => {
    expect(() => validateConfig({ provider: "typesafe" })).toThrow("Expected a provider, e.g. `typesafe()`.");
  });

  test("throws on duplicate rule names", () => {
    expect(() => validateConfig({ rules: [diataxis(), diataxis()] })).toThrow("Every rule must have a unique name.");
  });
});
