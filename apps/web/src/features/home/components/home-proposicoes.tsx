import Link from "next/link";
import { Suspense, type ReactNode } from "react";

import {
  ProposicaoRow,
  SEARCH_EXAMPLES,
  buildFeedHref,
  feed,
} from "@/shared/proposicao";
import { Badge, ChipLink, SkeletonRows, SparklesIcon } from "@/shared/ui";

import {
  pickDestaques,
  type Destaque,
  type TopicResult,
} from "../lib/destaques";

const TOTAL_DESTAQUES = 3;
// 6x1 e Previdência praticamente se resumem à proposta que já aparece como
// destaque, então a busca por eles repetiria a linha.
const TOPICOS_BUSCA = [
  ...SEARCH_EXAMPLES.filter(
    (termo) =>
      termo !== "Trabalho 6x1" &&
      termo !== "Reforma da Previdência" &&
      termo !== "Porte de arma",
  ),
  "Licenciamento ambiental",
];
// Uma consulta por assunto a cada visita estouraria o limite por IP da API.
const DESTAQUES_CACHE: RequestInit = { next: { revalidate: 3600 } };

function buscaHref(termo: string): string {
  return buildFeedHref("/proposicoes", {
    ordenacao: "mais-votadas",
    query: termo.toLowerCase(),
    tema: null,
  });
}

export function HomeProposicoes() {
  return (
    <ProposicoesSection>
      <Suspense fallback={<DestaquesSkeleton />}>
        <DestaquesRows />
      </Suspense>
    </ProposicoesSection>
  );
}

export function ProposicoesSection({ children }: { children: ReactNode }) {
  return (
    <section
      aria-labelledby="home-propostas"
      className="border-b border-border"
    >
      <div className="mx-auto grid w-full min-w-0 max-w-5xl gap-10 px-4 py-12 md:py-16">
        <h2
          className="max-w-[40ch] text-2xl leading-tight font-[700] tracking-[-0.01em] text-balance text-ink"
          id="home-propostas"
        >
          Você responde sobre as mesmas propostas que os deputados votaram
        </h2>

        <div className="grid min-w-0 gap-6">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm leading-normal text-muted">
            <Badge tone="neutral">
              <SparklesIcon
                aria-hidden="true"
                className="size-3.5 shrink-0 text-primary"
              />
              Resumo por IA
            </Badge>
            <span className="min-w-0">O texto oficial fica a um clique.</span>
          </p>

          {children}

          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="w-full text-sm text-muted sm:w-auto">
                Buscar por assunto:
              </span>
              {TOPICOS_BUSCA.map((termo) => (
                <ChipLink href={buscaHref(termo)} key={termo}>
                  {termo}
                </ChipLink>
              ))}
            </div>
            <Link
              className="inline-flex min-h-11 items-center text-sm font-[650] text-primary underline-offset-2 hover:underline sm:ml-auto"
              href="/proposicoes"
            >
              Ver todas as propostas
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export function DestaquesList({ items }: { items: readonly Destaque[] }) {
  if (items.length === 0) {
    return (
      <p className="border-t border-border pt-6 text-base leading-normal text-muted">
        Nenhuma proposta para mostrar agora.
      </p>
    );
  }

  return (
    <div className="grid min-w-0 border-t border-border">
      {items.map(({ card, topic }) => (
        <ProposicaoRow
          card={card}
          href={`/proposicoes/${card.externalIdProposicao}`}
          key={card.externalIdProposicao}
          showResumoIaBadgeOnMobile={false}
          topic={topic ?? undefined}
        />
      ))}
    </div>
  );
}

async function DestaquesRows() {
  return <DestaquesList items={await loadDestaques()} />;
}

// As linhas saem dos assuntos dos chips; a lista geral só completa as vagas
// de um assunto sem resultado.
async function loadDestaques(): Promise<readonly Destaque[]> {
  try {
    const byTopic = await Promise.all(SEARCH_EXAMPLES.map(loadTopResult));
    const picked = pickDestaques(byTopic, [], TOTAL_DESTAQUES);
    if (picked.length === TOTAL_DESTAQUES) return picked;

    const { items } = await feed(
      TOTAL_DESTAQUES + picked.length,
      0,
      "mais-votadas",
      undefined,
      undefined,
      DESTAQUES_CACHE,
    );
    return pickDestaques(byTopic, items, TOTAL_DESTAQUES);
  } catch {
    return [];
  }
}

async function loadTopResult(termo: string): Promise<TopicResult> {
  try {
    const { items } = await feed(
      1,
      0,
      "mais-votadas",
      undefined,
      termo.toLowerCase(),
      DESTAQUES_CACHE,
    );
    return { topic: termo, card: items[0] ?? null };
  } catch {
    return { topic: termo, card: null };
  }
}

function DestaquesSkeleton() {
  return (
    <div className="grid min-w-0 border-t border-border pt-1">
      <SkeletonRows count={TOTAL_DESTAQUES} />
    </div>
  );
}
