import type { DeputadoCard } from "@vota-comigo/shared-types";
import { headers } from "next/headers";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";

import {
  buildDeputadoHref,
  DeputadoRow,
  FILTROS_PADRAO,
  buildDeputadosFeedHref,
  feed,
  toEstadoLabel,
  ufsDisponiveis,
} from "@/shared/deputado";
import { ChipLink, SkeletonRows } from "@/shared/ui";

import { toDiaIndex, toOffsetAmostraDiaria } from "../lib/amostra-diaria";
import { toUfDoVisitante } from "../lib/uf-do-visitante";

const TAMANHO_AMOSTRA = 3;
const ESTADOS_EXEMPLO = ["SP", "MG", "RJ", "BA", "RS"] as const;

type Amostra = {
  items: readonly DeputadoCard[];
  siglaUf: string | null;
};

function estadoHref(siglaUf: string): string {
  return buildDeputadosFeedHref("/deputados", {
    ...FILTROS_PADRAO,
    query: null,
    ufs: [siglaUf],
  });
}

export function HomeDeputados() {
  return (
    <Suspense fallback={<AmostraSkeleton />}>
      <AmostraLoaded />
    </Suspense>
  );
}

export function DeputadosSection({
  children,
  siglaUf,
}: {
  children?: ReactNode;
  siglaUf: string | null;
}) {
  return (
    <section
      aria-labelledby="home-deputados"
      className="border-b border-border"
    >
      <div className="mx-auto grid w-full min-w-0 max-w-5xl gap-10 px-4 py-12 md:py-16">
        <div className="grid min-w-0 gap-5">
          <div className="grid max-w-[60ch] gap-3">
            <h2
              className="text-2xl leading-tight font-[700] tracking-[-0.01em] text-balance text-ink"
              id="home-deputados"
            >
              Conheça os deputados além dos votos
            </h2>
            <p className="text-base leading-normal text-muted">
              Consulte presença, propostas assinadas, comissões e uso da cota
              parlamentar.
            </p>
          </div>

          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="text-sm text-muted">Comece por um estado:</span>
            {ESTADOS_EXEMPLO.map((siglaUf) => (
              <ChipLink href={estadoHref(siglaUf)} key={siglaUf}>
                {toEstadoLabel(siglaUf)}
              </ChipLink>
            ))}
            <ChipLink href="/deputados">Outros</ChipLink>
          </div>
        </div>

        <div className="grid min-w-0 gap-6">
          <p className="text-sm leading-normal text-muted">
            {recorteLabel(siglaUf)}
          </p>

          {children}

          <div className="flex flex-wrap items-center justify-end gap-x-6 gap-y-2 text-sm font-[650]">
            <Link
              className="text-primary underline-offset-2 hover:underline"
              href="/deputados"
            >
              Ver todos os deputados
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export function AmostraList({ items }: { items: readonly DeputadoCard[] }) {
  if (items.length === 0) {
    return (
      <p className="border-t border-border pt-6 text-base leading-normal text-muted">
        Nenhum deputado para mostrar agora.
      </p>
    );
  }

  return (
    <div className="grid min-w-0 border-t border-border">
      {items.map((card) => (
        <DeputadoRow
          card={card}
          href={buildDeputadoHref(card.externalIdDeputado, card.nomePublico)}
          key={card.externalIdDeputado}
          showUsoCota
        />
      ))}
    </div>
  );
}

async function AmostraLoaded() {
  const { items, siglaUf } = await loadAmostra();

  return (
    <DeputadosSection siglaUf={siglaUf}>
      <AmostraList items={items} />
    </DeputadosSection>
  );
}

async function loadAmostra(): Promise<Amostra> {
  try {
    const siglaUf = await loadUfDoVisitante();
    const filtros =
      siglaUf === null ? FILTROS_PADRAO : { ...FILTROS_PADRAO, ufs: [siglaUf] };

    const primeira = await feed(TAMANHO_AMOSTRA, 0, null, filtros);
    const offset = toOffsetAmostraDiaria(
      toDiaIndex(new Date()),
      primeira.total,
      TAMANHO_AMOSTRA,
    );
    const amostra = { siglaUf };

    if (offset === 0) return { ...amostra, items: primeira.items };

    const { items } = await feed(TAMANHO_AMOSTRA, offset, null, filtros);
    return { ...amostra, items };
  } catch {
    return { items: [], siglaUf: null };
  }
}

// A sigla chega pela borda junto da requisição, então só entra na consulta
// depois de bater com a lista de estados que a Câmara reconhece.
async function loadUfDoVisitante(): Promise<string | null> {
  const cabecalhos = await headers();
  const country = cabecalhos.get("x-vercel-ip-country");
  const region = cabecalhos.get("x-vercel-ip-country-region");

  if (country === null || region === null) return null;

  const { items } = await ufsDisponiveis();
  return toUfDoVisitante(
    country,
    region,
    items.map((item) => item.siglaUf),
  );
}

function recorteLabel(siglaUf: string | null): string {
  if (siglaUf === null) return "Deputados de todo o Brasil.";
  return `Deputados de ${toEstadoLabel(siglaUf)}.`;
}

function AmostraSkeleton() {
  return (
    <DeputadosSection siglaUf={null}>
      <div className="grid min-w-0 border-t border-border pt-1">
        <SkeletonRows count={TAMANHO_AMOSTRA} />
      </div>
    </DeputadosSection>
  );
}
