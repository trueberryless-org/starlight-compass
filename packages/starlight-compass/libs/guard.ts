const WINDOW_MS = 60_000;
const UNKNOWN_ADDRESS = "unknown";

/**
 * Protects an endpoint that costs money per request. Rejects requests from other origins, as the endpoint is only
 * meant to be called by the pages of the site, and limits the requests per client address.
 *
 * The rate limit lives in the memory of the server process, so serverless hosts with several instances limit every
 * instance separately. Add limits at your host for strict guarantees.
 */
export function createRequestGuard(options: RequestGuardOptions) {
  const { now = Date.now, rateLimit } = options;
  const requests = new Map<string, number[]>();

  return function guard(
    request: Request,
    address?: string
  ): Response | undefined {
    if (!isSameOrigin(request)) {
      return Response.json(
        { error: "Cross-origin requests are not allowed." },
        { status: 403 }
      );
    }

    if (rateLimit === 0) return undefined;

    const time = now();
    const key = address ?? UNKNOWN_ADDRESS;
    const recent = (requests.get(key) ?? []).filter(
      (timestamp) => time - timestamp < WINDOW_MS
    );
    if (recent.length >= rateLimit) {
      requests.set(key, recent);

      return Response.json(
        { error: "Too many requests. Please try again later." },
        {
          headers: { "Retry-After": String(Math.ceil(WINDOW_MS / 1000)) },
          status: 429,
        }
      );
    }

    recent.push(time);
    requests.set(key, recent);
    prune(requests, time);

    return undefined;
  };
}

/** Browsers send the `Origin` header with every `fetch()` POST. Compares it to the host the request was sent to. */
function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  const host =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    new URL(request.url).host;

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

function prune(requests: Map<string, number[]>, time: number) {
  for (const [key, timestamps] of requests) {
    if (timestamps.every((timestamp) => time - timestamp >= WINDOW_MS))
      requests.delete(key);
  }
}

export interface RequestGuardOptions {
  /** Overrides the clock in tests. */
  now?: () => number;
  /** The maximum number of requests per client address and minute. `0` disables the limit. */
  rateLimit: number;
}
