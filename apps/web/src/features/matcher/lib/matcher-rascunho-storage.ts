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

export const MATCHER_RASCUNHO_STORAGE_KEY = "vota-comigo:matcher-rascunho";

export function loadRascunho(storage: RascunhoStorage): MatcherRascunho | null {
  try {
    const raw = storage.getItem(MATCHER_RASCUNHO_STORAGE_KEY);
    if (raw === null) return null;

    const rascunho = parseRascunho(raw);
    if (rascunho === null) storage.removeItem(MATCHER_RASCUNHO_STORAGE_KEY);
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
    storage.setItem(MATCHER_RASCUNHO_STORAGE_KEY, serializeRascunho(rascunho));
  } catch {}
}

export function clearRascunho(storage: RascunhoStorage): void {
  try {
    storage.removeItem(MATCHER_RASCUNHO_STORAGE_KEY);
  } catch {}
}
