import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  ComparativoDeputados,
  parseComparativoDeputadosIds,
} from "@/shared/deputado";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Comparar deputados",
  description:
    "Comparação de dois ou três deputados federais lado a lado, com presença, propostas assinadas, comissões e posição na cota parlamentar.",
};

type PageProps = {
  params: Promise<{ ids: string }>;
};

export default async function ComparativoDeputadosPage({ params }: PageProps) {
  const { ids } = await params;
  const externalIdsDeputado = parseComparativoDeputadosIds(ids);
  if (externalIdsDeputado === null) {
    notFound();
  }

  return (
    <main className="min-h-screen w-full min-w-0 overflow-x-hidden bg-bg text-ink">
      <div className="mx-auto box-border grid w-full min-w-0 max-w-5xl gap-8 px-4 pt-8 pb-16 md:pt-12">
        <header className="grid max-w-[68ch] gap-3">
          <h1 className="text-3xl leading-tight font-[720] text-balance text-ink">
            Comparar deputados
          </h1>
          <p className="text-sm leading-normal text-muted">
            Dados consolidados pela Câmara dos Deputados. Cada deputado aparece
            na última legislatura em que atuou, e é esse o período de todas as
            métricas da coluna.
          </p>
        </header>

        <ComparativoDeputados externalIdsDeputado={externalIdsDeputado} />
      </div>
    </main>
  );
}
