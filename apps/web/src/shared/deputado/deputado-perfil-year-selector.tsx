"use client";

import type { DeputadoPerfilValidYearRange } from "@vota-comigo/shared-types";
import { useEffect, useState } from "react";

import { listDeputadoPerfilYears } from "./deputado-perfil-year-options";
import { buildDeputadoPerfilYearHref } from "./deputado-perfil-year-url";

type DeputadoPerfilYearSelectorProps = {
  initialYear: number | null;
  validYearRange: DeputadoPerfilValidYearRange | null;
};

export function DeputadoPerfilYearSelector({
  initialYear,
  validYearRange,
}: DeputadoPerfilYearSelectorProps) {
  if (initialYear === null || validYearRange === null) return null;

  return (
    <AvailableDeputadoPerfilYearSelector
      initialYear={initialYear}
      validYearRange={validYearRange}
    />
  );
}

function AvailableDeputadoPerfilYearSelector({
  initialYear,
  validYearRange,
}: {
  initialYear: number;
  validYearRange: DeputadoPerfilValidYearRange;
}) {
  const [year, setYear] = useState(initialYear);
  const years = listDeputadoPerfilYears(validYearRange);

  useEffect(() => {
    replaceYearInAddress(initialYear);
  }, [initialYear]);

  return (
    <label className="grid w-full gap-2 sm:w-40" htmlFor="deputado-perfil-year">
      <span className="text-sm font-[650] leading-[1.3] text-ink">Ano</span>
      <select
        className="min-h-11 w-full rounded-md border border-border bg-white px-3 py-2.5 text-base leading-[1.4] text-ink transition-[border-color,background-color] duration-[180ms] ease-standard not-disabled:hover:border-border-strong"
        id="deputado-perfil-year"
        onChange={(event) => {
          const selectedYear = Number(event.target.value);
          setYear(selectedYear);
          replaceYearInAddress(selectedYear);
        }}
        value={year}
      >
        {years.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function replaceYearInAddress(year: number): void {
  if (typeof window === "undefined") return;

  const href = buildDeputadoPerfilYearHref(
    window.location.pathname,
    window.location.search,
    year,
  );
  window.history.replaceState(window.history.state, "", href);
}
