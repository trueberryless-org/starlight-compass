const MAX_ATTEMPTS = 4;

/**
 * Sends a request and retries with an exponential backoff while the response has one of the retryable statuses.
 * Returns the last response, which the caller must check.
 */
export async function fetchWithRetry(
  _fetch: typeof fetch,
  url: string,
  init: RequestInit,
  retryableStatuses: ReadonlySet<number>
): Promise<Response> {
  for (let attempt = 1; ; attempt++) {
    const response = await _fetch(url, init);

    if (
      response.ok ||
      !retryableStatuses.has(response.status) ||
      attempt >= MAX_ATTEMPTS
    )
      return response;

    await wait(500 * 2 ** (attempt - 1));
  }
}

function wait(delay: number) {
  return new Promise((resolve) => setTimeout(resolve, delay));
}
