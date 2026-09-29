import { describe, expect, test } from "vitest";

import { isAuditRequested, loadEnv } from "../../libs/env";

const root = new URL("../fixtures/env/", import.meta.url);

describe("loadEnv", () => {
  test("loads `.env` files for the current mode", () => {
    expect(loadEnv(root, "development", {})).toEqual({ SHARED: "development", TYPESAFE_API_KEY: "from-env-file" });
    expect(loadEnv(root, "production", {})).toEqual({ SHARED: "env", TYPESAFE_API_KEY: "from-env-file" });
  });

  test("prefers variables set in the shell", () => {
    expect(loadEnv(root, "production", { TYPESAFE_API_KEY: "from-shell" })["TYPESAFE_API_KEY"]).toBe("from-shell");
  });

  test("supports projects without `.env` files", () => {
    expect(loadEnv(new URL("../fixtures/", import.meta.url), "production", {})).toEqual({});
  });
});

describe("isAuditRequested", () => {
  test("reads the `STARLIGHT_COMPASS_AUDIT` variable", () => {
    expect(isAuditRequested({ STARLIGHT_COMPASS_AUDIT: "1" })).toBe(true);
    expect(isAuditRequested({ STARLIGHT_COMPASS_AUDIT: "true" })).toBe(true);
    expect(isAuditRequested({ STARLIGHT_COMPASS_AUDIT: "0" })).toBe(false);
    expect(isAuditRequested({})).toBe(false);
  });
});
