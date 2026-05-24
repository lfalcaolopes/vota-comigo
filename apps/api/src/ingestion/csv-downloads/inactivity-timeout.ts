export class InactivityTimeoutError extends Error {
  constructor() {
    super('timeout por inatividade');
  }
}

export async function withInactivityTimeout<T>(
  operation: Promise<T>,
  inactivityTimeoutMs: number,
  abortController: AbortController,
): Promise<T> {
  let timeout: NodeJS.Timeout | undefined;

  try {
    return await Promise.race([
      operation,
      new Promise<T>((_, reject) => {
        timeout = setTimeout(() => {
          abortController.abort();
          reject(new InactivityTimeoutError());
        }, inactivityTimeoutMs);
      }),
    ]);
  } finally {
    if (timeout !== undefined) {
      clearTimeout(timeout);
    }
  }
}

export function bodyWithInactivityTimeout(
  body: AsyncIterable<Uint8Array>,
  inactivityTimeoutMs: number,
  abortController: AbortController,
): AsyncIterable<Uint8Array> {
  return {
    async *[Symbol.asyncIterator]() {
      const iterator = body[Symbol.asyncIterator]();

      try {
        while (true) {
          const result = await withInactivityTimeout(
            iterator.next(),
            inactivityTimeoutMs,
            abortController,
          );

          if (result.done === true) {
            return;
          }

          yield result.value;
        }
      } finally {
        await iterator.return?.();
      }
    },
  };
}
