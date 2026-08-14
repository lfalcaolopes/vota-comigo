"use client";

import { useState } from "react";

import { ErrorState, SkeletonRows } from "@/shared/ui";

import { ComparativoDeputadosView } from "./comparativo-deputados-view";
import { DeputadoPerfilYearSelector } from "./deputado-perfil-year-selector";
import { useComparativoDeputados } from "./use-comparativo-deputados";

export function ComparativoDeputados({
  externalIdsDeputado,
  initialYear = null,
  showYearSelector = true,
}: {
  externalIdsDeputado: readonly number[];
  initialYear?: number | null;
  showYearSelector?: boolean;
}) {
  const [year, setYear] = useState<number | null>(initialYear);
  const { state, retry } = useComparativoDeputados(externalIdsDeputado, year);

  if (state.status === "loading") {
    return <SkeletonRows count={5} />;
  }

  if (state.status === "error") {
    return (
      <ErrorState
        body="Não foi possível carregar a comparação. Tente novamente."
        onRetry={retry}
      />
    );
  }

  const { response } = state;
  const comparableYears = response.comparableYears;

  return (
    <div className="grid gap-5">
      {showYearSelector && comparableYears.length > 1 ? (
        <div className="sm:justify-self-end">
          <DeputadoPerfilYearSelector
            availableYears={comparableYears}
            initialYear={response.year}
            onYearChange={setYear}
            validYearRange={{
              startYear: Math.min(...comparableYears),
              endYear: Math.max(...comparableYears),
            }}
          />
        </div>
      ) : null}

      <ComparativoDeputadosView response={response} />
    </div>
  );
}
