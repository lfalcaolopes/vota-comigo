"use client";

import { useMatcherResultadoDetalhe } from "../../hooks/use-matcher-resultado-detalhe";
import { MatcherRouteGate } from "../flow/matcher-route-gate";
import { MatcherStepFrame } from "../flow/matcher-step-frame";
import { DeputadoDetalhe } from "./deputado-detalhe";

const ROUTE = "/matcher/resultado" as const;

export function MatcherResultadoDetalhe({
  externalIdDeputado,
}: {
  externalIdDeputado: number;
}) {
  const { detalhe, retry, status } =
    useMatcherResultadoDetalhe(externalIdDeputado);

  return (
    <MatcherRouteGate route={ROUTE}>
      <MatcherStepFrame
        description="Veja como o deputado votou nas proposições usadas para calcular esta compatibilidade."
        route={ROUTE}
        title="Detalhe do resultado"
      >
        <div className="mx-auto w-full max-w-6xl">
          <div className="w-full max-w-4xl">
            <DeputadoDetalhe
              detalhe={detalhe}
              onRetry={retry}
              status={status}
            />
          </div>
        </div>
      </MatcherStepFrame>
    </MatcherRouteGate>
  );
}
