"use client";

import type {
  DeputadoProposicaoAssinada,
  DeputadoProposicoesAssinadasResponse,
} from "@vota-comigo/shared-types";

import { InlineMessage, SkeletonRows, SourceLink } from "@/shared/ui";

import { formatData } from "./presentation";
import type { DeputadoYearCacheState } from "./use-deputado-year-cache";

export type ProposicoesAssinadasState =
  DeputadoYearCacheState<DeputadoProposicoesAssinadasResponse>;

export function DeputadoProposicoesAssinadasSection({
  state,
}: {
  state: ProposicoesAssinadasState;
}) {
  return (
    <section
      aria-labelledby="deputado-proposicoes-assinadas-title"
      className="grid gap-5"
    >
      <div className="grid max-w-[70ch] gap-2 border-t border-border pt-6">
        <h3
          className="text-lg font-[680] leading-snug text-ink text-balance"
          id="deputado-proposicoes-assinadas-title"
        >
          Proposições assinadas
        </h3>
        <p className="text-sm leading-normal text-muted text-pretty">
          {state.status === "success"
            ? `${contagemLabel(state.response)}. `
            : null}
          Proposições em que o deputado consta como signatário na Câmara, como
          proponente ou apoiador.
        </p>
      </div>
      {state.status === "loading" ? <SkeletonRows count={3} /> : null}
      {state.status === "error" ? (
        <InlineMessage
          body="Tente novamente mais tarde. O restante do perfil continua disponível."
          title="Não foi possível carregar as proposições assinadas agora."
          tone="danger"
        />
      ) : null}
      {state.status === "success" && state.response.items.length === 0 ? (
        <InlineMessage
          body="Não há proposições assinadas disponíveis para este ano."
          title="Nenhuma proposição assinada encontrada"
        />
      ) : null}
      {state.status === "success" && state.response.items.length > 0 ? (
        <ProposicoesAssinadasList items={state.response.items} />
      ) : null}
    </section>
  );
}

function ProposicoesAssinadasList({
  items,
}: {
  items: readonly DeputadoProposicaoAssinada[];
}) {
  return (
    <div className="divide-y divide-border border-y border-border">
      {items.map((item) => (
        <article
          className="grid min-w-0 gap-2 py-5"
          key={item.externalIdProposicao}
        >
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
            {identificadorLegislativo(item) !== null ? (
              <h4 className="font-[680] text-ink">
                {identificadorLegislativo(item)}
              </h4>
            ) : null}
            <time className="text-muted" dateTime={item.dataApresentacao}>
              Apresentada em {formatData(item.dataApresentacao)}
            </time>
          </div>
          {item.ementa !== null ? (
            <p className="max-w-[70ch] text-sm leading-normal text-ink text-pretty">
              {item.ementa}
            </p>
          ) : null}
          <SourceLink href={item.urlOficial} rel="noreferrer" target="_blank">
            Ver proposição na Câmara
          </SourceLink>
        </article>
      ))}
    </div>
  );
}

function identificadorLegislativo(
  item: DeputadoProposicaoAssinada,
): string | null {
  if (item.siglaTipo === null) return null;
  if (item.numero === null) return item.siglaTipo;
  if (item.ano === null) return `${item.siglaTipo} ${item.numero}`;
  return `${item.siglaTipo} ${item.numero}/${item.ano}`;
}

function contagemLabel(response: DeputadoProposicoesAssinadasResponse): string {
  const substantivo =
    response.total === 1 ? "proposição assinada" : "proposições assinadas";
  return `${response.total} ${substantivo} em ${response.year}`;
}
