import type { ProposicaoCard } from "@vota-comigo/shared-types";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";

import {
  ProposicaoRow,
  SEARCH_EXAMPLES,
  buildFeedHref,
  feed,
} from "@/shared/proposicao";
import { Badge, ChipLink, SkeletonRows, SparklesIcon } from "@/shared/ui";

const TOTAL_DESTAQUES = 3;

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
        <div className="grid min-w-0 gap-5">
          <div className="grid max-w-[60ch] gap-3">
            <h2
              className="text-2xl leading-tight font-[700] tracking-[-0.01em] text-balance text-ink"
              id="home-propostas"
            >
              Quais propostas os deputados votaram
            </h2>
            <p className="text-base leading-normal text-muted">
              A comparação sai daqui: para cada proposta, o site usa a votação
              que decidiu o mérito. Na lista dá para procurar pelo assunto, pelo
              nome ou pelo número.
            </p>
          </div>

          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="text-sm text-muted">Comece por:</span>
            {SEARCH_EXAMPLES.map((termo) => (
              <ChipLink href={buscaHref(termo)} key={termo}>
                {termo}
              </ChipLink>
            ))}
          </div>
        </div>

        <div className="grid min-w-0 gap-6">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm leading-normal text-muted">
            <Badge tone="neutral">
              <SparklesIcon
                aria-hidden="true"
                className="size-3.5 shrink-0 text-primary"
              />
              Resumo por IA
            </Badge>
            <span className="min-w-0">
              Onde aparece este selo, a proposta vem com um resumo curto no
              lugar do texto oficial, que fica a um clique.
            </span>
          </p>

          {children}

          <div className="flex flex-wrap items-center justify-end gap-x-6 gap-y-2 text-sm font-[650]">
            <Link
              className="text-primary underline-offset-2 hover:underline"
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

export function DestaquesList({ items }: { items: readonly ProposicaoCard[] }) {
  if (items.length === 0) {
    return (
      <p className="border-t border-border pt-6 text-base leading-normal text-muted">
        Nenhuma proposta para mostrar agora.
      </p>
    );
  }

  return (
    <div className="grid min-w-0 border-t border-border">
      {items.map((card) => (
        <ProposicaoRow
          card={card}
          href={`/proposicoes/${card.externalIdProposicao}`}
          key={card.externalIdProposicao}
        />
      ))}
    </div>
  );
}

async function DestaquesRows() {
  return <DestaquesList items={await loadDestaques()} />;
}

async function loadDestaques(): Promise<readonly ProposicaoCard[]> {
  try {
    const { items } = await feed(TOTAL_DESTAQUES, 0);
    return items;
  } catch {
    return [];
  }
}

function DestaquesSkeleton() {
  return (
    <div className="grid min-w-0 border-t border-border pt-1">
      <SkeletonRows count={TOTAL_DESTAQUES} />
    </div>
  );
}
