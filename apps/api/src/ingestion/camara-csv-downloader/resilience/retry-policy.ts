export function isTransientHttpStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

export function retryDelayMs(
  response: { status: number; retryAfter?: string },
  attempt: number,
  retryBackoffMs: readonly number[],
): number {
  if (response.status === 429 && response.retryAfter !== undefined) {
    const retryAfterMs = parseRetryAfterMs(response.retryAfter);

    if (retryAfterMs !== undefined) {
      return retryAfterMs;
    }
  }

  return backoffDelayMs(attempt, retryBackoffMs);
}

export function backoffDelayMs(
  attempt: number,
  retryBackoffMs: readonly number[],
): number {
  return retryBackoffMs[attempt - 1] ?? retryBackoffMs.at(-1) ?? 0;
}

export function parseRetryAfterMs(value: string): number | undefined {
  const seconds = Number(value);

  if (Number.isFinite(seconds) && seconds >= 0) {
    return seconds * 1000;
  }

  const retryAt = Date.parse(value);

  if (!Number.isNaN(retryAt)) {
    return Math.max(0, retryAt - Date.now());
  }

  return undefined;
}

export function attemptsExhaustedError(
  reason: string,
  maxAttempts: number,
): Error {
  return new Error(`${reason} após ${maxAttempts} tentativas`);
}
