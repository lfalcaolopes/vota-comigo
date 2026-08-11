"use client";

import { useEffect, useRef, useState } from "react";

export type DeputadoYearCacheState<TResponse> =
  | { status: "loading" }
  | { status: "error" }
  | { status: "success"; response: TResponse };

export function useDeputadoYearCache<TResponse>({
  externalIdDeputado,
  initialYear,
  query,
  year,
}: {
  externalIdDeputado: number;
  initialYear: number;
  query: (externalIdDeputado: number, year: number) => Promise<TResponse>;
  year: number;
}): DeputadoYearCacheState<TResponse> {
  const [cache, setCache] = useState<
    Record<number, DeputadoYearCacheState<TResponse>>
  >({ [initialYear]: { status: "loading" } });
  const requestedYears = useRef(new Set<number>());

  useEffect(() => {
    if (requestedYears.current.has(year)) return;
    requestedYears.current.add(year);
    setCache((current) => ({
      ...current,
      [year]: current[year] ?? { status: "loading" },
    }));

    void query(externalIdDeputado, year).then(
      (response) => {
        setCache((current) => ({
          ...current,
          [year]: { status: "success", response },
        }));
      },
      () => {
        setCache((current) => ({ ...current, [year]: { status: "error" } }));
      },
    );
  }, [externalIdDeputado, query, year]);

  return cache[year] ?? { status: "loading" };
}
