import type { ProposicaoCard } from "@vota-comigo/shared-types";
import Link from "next/link";

import { ProposicaoRow } from "@/shared/proposicao";
import { Badge, SparklesIcon } from "@/shared/ui";

export function HomeEmVotacao({ proposicoes }: { proposicoes: ProposicaoCard[] }) {
  return (
    <section aria-labelledby="home-em-votacao" className="border-b border-border">
      <div className="mx-auto grid w-full min-w-0 max-w-5xl gap-6 px-4 py-12 md:py-16">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <div className="grid max-w-[60ch] gap-3">
            <h2
              className="text-2xl leading-tight font-[700] tracking-[-0.01em] text-balance text-ink"
              id="home-em-votacao"
            >
              O que está em votação
            </h2>
            <p className="text-base leading-normal text-muted">
              Proposições recentes que o matcher consegue computar, direto dos
              dados oficiais.
            </p>
          </div>
          <Link
            className="shrink-0 text-sm font-[650] text-primary underline-offset-2 hover:underline"
            href="/proposicoes"
          >
            Ver todas as proposições
          </Link>
        </div>

        <p className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm leading-normal text-muted">
          <Badge tone="neutral">
            <SparklesIcon
              aria-hidden="true"
              className="size-3.5 shrink-0 text-primary"
            />
            Resumo por IA
          </Badge>
          <span className="min-w-0">
            Onde aparece este selo, a proposição já vem em linguagem comum. A
            versão oficial fica sempre a um clique.
          </span>
        </p>

        {proposicoes.length > 0 ? (
          <div className="grid min-w-0 border-t border-border">
            {proposicoes.map((card) => (
              <ProposicaoRow
                card={card}
                href={`/proposicoes/${card.externalIdProposicao}`}
                key={card.externalIdProposicao}
              />
            ))}
          </div>
        ) : (
          <p className="border-t border-border pt-6 text-base leading-normal text-muted">
            Nenhuma proposição computável para exibir agora.{" "}
            <Link
              className="font-[650] text-primary underline-offset-2 hover:underline"
              href="/proposicoes"
            >
              Abrir a lista completa
            </Link>
            .
          </p>
        )}
      </div>
    </section>
  );
}
