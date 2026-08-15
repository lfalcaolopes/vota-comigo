"use client";

import { ErrorState, SkeletonRows } from "@/shared/ui";

import { ComparativoDeputadosView } from "./comparativo-deputados-view";
import { useComparativoDeputados } from "./use-comparativo-deputados";

export function ComparativoDeputados({
  externalIdsDeputado,
}: {
  externalIdsDeputado: readonly number[];
}) {
  const { state, retry } = useComparativoDeputados(externalIdsDeputado);

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

  return <ComparativoDeputadosView response={state.response} />;
}
