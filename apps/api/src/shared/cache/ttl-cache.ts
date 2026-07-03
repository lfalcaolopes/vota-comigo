export type Clock = () => number;

export type TtlCache<V> = {
  get(key: string): V | undefined;
  set(key: string, value: V): void;
};

export type TtlCacheOptions = {
  readonly ttlMs: number;
  readonly maxEntries: number;
  readonly clock?: Clock;
};

type Entry<V> = {
  readonly value: V;
  readonly expiresAt: number;
};

export function createTtlCache<V>(options: TtlCacheOptions): TtlCache<V> {
  const clock = options.clock ?? Date.now;
  const store = new Map<string, Entry<V>>();

  return {
    get(key) {
      const entry = store.get(key);
      if (entry === undefined) {
        return undefined;
      }
      if (entry.expiresAt <= clock()) {
        store.delete(key);
        return undefined;
      }
      return entry.value;
    },

    set(key, value) {
      store.delete(key);
      store.set(key, { value, expiresAt: clock() + options.ttlMs });
      while (store.size > options.maxEntries) {
        const oldest = store.keys().next().value;
        if (oldest === undefined) {
          break;
        }
        store.delete(oldest);
      }
    },
  };
}
