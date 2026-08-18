import {
  parseRascunho,
  serializeRascunho,
  type MatcherRascunho,
} from "./matcher-rascunho";

export type RascunhoStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

const STORAGE_KEY = "vota-comigo:matcher-rascunho";

export function loadRascunho(storage: RascunhoStorage): MatcherRascunho | null {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw === null) return null;

    const rascunho = parseRascunho(raw);
    if (rascunho === null) storage.removeItem(STORAGE_KEY);
    return rascunho;
  } catch {
    return null;
  }
}

export function saveRascunho(
  storage: RascunhoStorage,
  rascunho: MatcherRascunho,
): void {
  try {
    storage.setItem(STORAGE_KEY, serializeRascunho(rascunho));
  } catch {}
}

export function clearRascunho(storage: RascunhoStorage): void {
  try {
    storage.removeItem(STORAGE_KEY);
  } catch {}
}
