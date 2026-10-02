import { describe, expect, test } from "vitest";

import { createRequestGuard } from "../../libs/guard";

function getRequest(headers: Record<string, string> = { origin: "https://example.com" }) {
  return new Request("https://example.com/api/ask", { headers: { host: "example.com", ...headers }, method: "POST" });
}

describe("createRequestGuard", () => {
  test("allows requests from the same origin", () => {
    expect(createRequestGuard({ rateLimit: 5 })(getRequest(), "1.1.1.1")).toBeUndefined();
  });

  test("rejects requests from another origin or without origin", async () => {
    const guard = createRequestGuard({ rateLimit: 5 });

    expect(guard(getRequest({ origin: "https://evil.example" }))?.status).toBe(403);
    expect(guard(getRequest({}))?.status).toBe(403);
    expect(guard(getRequest({ origin: "not a url" }))?.status).toBe(403);
  });

  test("prefers the forwarded host behind proxies", () => {
    const request = getRequest({ origin: "https://docs.example.org", "x-forwarded-host": "docs.example.org" });

    expect(createRequestGuard({ rateLimit: 5 })(request)).toBeUndefined();
  });

  test("limits the requests per address and minute", () => {
    let time = 0;
    const guard = createRequestGuard({ now: () => time, rateLimit: 2 });

    expect(guard(getRequest(), "a")).toBeUndefined();
    expect(guard(getRequest(), "a")).toBeUndefined();
    expect(guard(getRequest(), "a")?.status).toBe(429);
    expect(guard(getRequest(), "b")).toBeUndefined();

    time = 61_000;

    expect(guard(getRequest(), "a")).toBeUndefined();
  });

  test("does not limit requests with a limit of zero", () => {
    const guard = createRequestGuard({ rateLimit: 0 });

    for (let index = 0; index < 100; index++) expect(guard(getRequest(), "a")).toBeUndefined();
  });
});
