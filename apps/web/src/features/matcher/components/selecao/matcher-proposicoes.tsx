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
  const feed = useFeedState({
    items: initialProposicoes,
    total: initialTotal,
  });

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
              if (matcher.canAdvanceSelecao) navigate("/matcher/posicoes/1");
            }}
            onBack={() => navigate("/matcher/local")}
            onApplyFiltros={feed.applyFiltros}
            onClearSearch={feed.clearSearch}
            onClearTudo={feed.clearTudo}
            onLoadMore={feed.loadMore}
            onSubmitSearch={feed.submitSearch}
            filtros={feed.filtros}
            onToggle={matcher.toggleProposicao}
            query={feed.query}
            selected={matcher.state.selected}
            status={feed.status}
            temas={temas}
            total={feed.total}
            totalSelecionadas={matcher.validation.totalSelecionadas}
          />
        </div>
      </MatcherStepFrame>
    </MatcherRouteGate>
  );
}
