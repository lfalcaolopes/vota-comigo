import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  ComparativoDeputados,
  parseComparativoDeputadosIds,
} from "@/shared/deputado";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Comparar deputados",
  description:
    "Comparação de dois ou três deputados federais lado a lado, com presença, proposições assinadas, comissões e posição na cota parlamentar.",
};

type PageProps = {
  params: Promise<{ ids: string }>;
  searchParams: Promise<{ year?: string | string[] }>;
};

function parseYear(raw: string | string[] | undefined): number | null {
  return typeof raw === "string" && /^\d{4}$/.test(raw) ? Number(raw) : null;
}

export default async function ComparativoDeputadosPage({
  params,
  searchParams,
}: PageProps) {
  const [{ ids }, { year }] = await Promise.all([params, searchParams]);
  const externalIdsDeputado = parseComparativoDeputadosIds(ids);
  if (externalIdsDeputado === null) {
    notFound();
  }

  return (
    <main className="min-h-screen w-full min-w-0 overflow-x-hidden bg-bg text-ink">
      <div className="mx-auto box-border grid w-full min-w-0 max-w-5xl gap-8 px-4 pt-8 pb-16 md:pt-12">
        <header className="grid max-w-[68ch] gap-3">
          <Link
            className="text-sm font-[650] text-muted underline decoration-border underline-offset-2 transition-colors duration-[140ms] ease-standard hover:text-ink hover:decoration-current"
            href="/deputados"
          >
            Voltar aos deputados
          </Link>
          <h1 className="text-3xl leading-tight font-[720] text-balance text-ink">
            Comparar deputados
          </h1>
          <p className="text-sm leading-normal text-muted">
            Dados consolidados pela Câmara dos Deputados. As métricas do ano
            usam o ano selecionado; a presença considera toda a base.
          </p>
        </header>

        <ComparativoDeputados
          externalIdsDeputado={externalIdsDeputado}
          initialYear={parseYear(year)}
        />
      </div>
    </main>
  );
}
