"use client";

import type { ComparativoDeputadosResponse } from "@vota-comigo/shared-types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { comparativoDeputados } from "./queries";

export type ComparativoDeputadosState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "success"; response: ComparativoDeputadosResponse };

export function useComparativoDeputados(
  externalIdsDeputado: readonly number[],
  year: number | null,
): { state: ComparativoDeputadosState; retry: () => void } {
  const idsKey = externalIdsDeputado.join(",");
  const cacheKey = `${idsKey}:${year ?? ""}`;
  const ids = useMemo(() => idsKey.split(",").map(Number), [idsKey]);
  const [cache, setCache] = useState<Record<string, ComparativoDeputadosState>>(
    {},
  );
  const requestedKeys = useRef(new Set<string>());

  const load = useCallback(() => {
    requestedKeys.current.add(cacheKey);
    setCache((current) => ({ ...current, [cacheKey]: { status: "loading" } }));

    void comparativoDeputados(ids, year ?? undefined).then(
      (response) => {
        setCache((current) => ({
          ...current,
          [cacheKey]: { status: "success", response },
        }));
      },
      () => {
        setCache((current) => ({
          ...current,
          [cacheKey]: { status: "error" },
        }));
      },
    );
  }, [cacheKey, ids, year]);

  useEffect(() => {
    if (requestedKeys.current.has(cacheKey)) return;
    load();
  }, [cacheKey, load]);

  return { state: cache[cacheKey] ?? { status: "loading" }, retry: load };
}
