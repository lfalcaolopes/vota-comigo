"use client";

import type { ProposicaoCard, TemaDisponivel } from "@vota-comigo/shared-types";

import { useFeedState } from "@/shared/proposicao";

import { useMatcherNavigation } from "../../hooks/use-matcher-navigation";
import { MatcherRouteGate } from "../flow/matcher-route-gate";
import { MatcherStepFrame } from "../flow/matcher-step-frame";
import { useMatcher } from "../matcher-provider";
import { StepSelecao } from "./step-selecao";

const ROUTE = "/matcher/proposicoes" as const;

export function MatcherProposicoes({
  initialProposicoes,
  initialTotal,
  temas,
}: {
  initialProposicoes: ProposicaoCard[];
  initialTotal: number;
  temas: readonly TemaDisponivel[];
}) {
  const matcher = useMatcher();
  const navigate = useMatcherNavigation();
  const feed = useFeedState(initialProposicoes, initialTotal);

  return (
    <MatcherRouteGate route={ROUTE}>
      <MatcherStepFrame route={ROUTE}>
        <div className="mx-auto w-full max-w-6xl">
          <StepSelecao
            canAdvance={matcher.canAdvanceSelecao}
            canLoadMore={feed.canLoadMore}
            display={feed.display}
            items={feed.items}
            onAdvance={() => {
              if (matcher.canAdvanceSelecao) navigate("/matcher/posicoes");
            }}
            onBack={() => navigate("/matcher/local")}
            onChangeOrdenacao={feed.changeOrdenacao}
            onChangeTema={(cod) => {
              if (feed.tema === cod) {
                void feed.clearTema();
              } else {
                void feed.changeTema(cod);
              }
            }}
            onClearFilters={feed.clearFilters}
            onClearSearch={feed.clearSearch}
            onLoadMore={feed.loadMore}
            onSubmitSearch={feed.submitSearch}
            onToggle={matcher.toggleProposicao}
            ordenacao={feed.ordenacao}
            query={feed.query}
            selected={matcher.state.selected}
            status={feed.status}
            tema={feed.tema}
            temas={temas}
            total={feed.total}
            totalSelecionadas={matcher.validation.totalSelecionadas}
          />
        </div>
      </MatcherStepFrame>
    </MatcherRouteGate>
  );
}
