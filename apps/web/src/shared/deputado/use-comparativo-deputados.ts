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
): {
  state: ComparativoDeputadosState;
  retry: () => void;
} {
  const idsKey = externalIdsDeputado.join(",");
  const ids = useMemo(() => idsKey.split(",").map(Number), [idsKey]);
  const [cache, setCache] = useState<Record<string, ComparativoDeputadosState>>(
    {},
  );
  const requestedKeys = useRef(new Set<string>());

  const load = useCallback(() => {
    requestedKeys.current.add(idsKey);
    setCache((current) => ({ ...current, [idsKey]: { status: "loading" } }));

    void comparativoDeputados(ids).then(
      (response) => {
        setCache((current) => ({
          ...current,
          [idsKey]: { status: "success", response },
        }));
      },
      () => {
        setCache((current) => ({
          ...current,
          [idsKey]: { status: "error" },
        }));
      },
    );
  }, [idsKey, ids]);

  useEffect(() => {
    if (requestedKeys.current.has(idsKey)) return;
    load();
  }, [idsKey, load]);

  return { state: cache[idsKey] ?? { status: "loading" }, retry: load };
}
