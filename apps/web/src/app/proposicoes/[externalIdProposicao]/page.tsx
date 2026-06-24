import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { NotFoundError } from "@/shared/lib/api-client";
import {
  buildFeedHref,
  ProposicaoBreadcrumb,
  ProposicaoDetalhe,
  detalhe,
  parseFeedUrlState,
  toIdentificadorLegislativo,
  type FeedSearchParams,
} from "@/shared/proposicao";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ externalIdProposicao: string }>;
  searchParams: Promise<FeedSearchParams>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { externalIdProposicao } = await params;

  let proposicao;
  try {
    proposicao = await detalhe(Number(externalIdProposicao));
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound();
    }
    // Transient failure: render a safe title and let the page body surface the error boundary.
    return { title: "Proposição | Quem Vota Comigo" };
  }

  const identificador = toIdentificadorLegislativo(proposicao) ?? "Proposição";
  const inicioEmenta = proposicao.ementa?.slice(0, 80).trim();

  return {
    title: inicioEmenta
      ? `${identificador} — ${inicioEmenta} | Quem Vota Comigo`
      : `${identificador} | Quem Vota Comigo`,
    description: proposicao.ementa ?? undefined,
  };
}

export default async function ProposicaoDetalhePage({
  params,
  searchParams,
}: PageProps) {
  const { externalIdProposicao } = await params;
  const feedHref = buildFeedHref(
    "/proposicoes",
    parseFeedUrlState(await searchParams),
  );

  let proposicao;
  try {
    proposicao = await detalhe(Number(externalIdProposicao));
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound();
    }
    throw error;
  }

  return (
    <main className="min-h-screen w-full min-w-0 overflow-x-hidden bg-bg text-ink">
      <div className="mx-auto grid w-full min-w-0 max-w-280 gap-8 px-4 pt-8 pb-16 md:pt-12">
        <ProposicaoBreadcrumb feedHref={feedHref} proposicao={proposicao} />
        <ProposicaoDetalhe proposicao={proposicao} />
      </div>
    </main>
  );
}
