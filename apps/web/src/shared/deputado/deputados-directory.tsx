import type { DeputadoDiscoveryItem } from "@vota-comigo/shared-types";
import Link from "next/link";

import { buildDeputadoHref } from "./deputado-url";

export function DeputadosDirectory({
  deputados,
}: {
  deputados: readonly DeputadoDiscoveryItem[];
}) {
  const groups = Map.groupBy(
    deputados,
    (deputado) => deputado.siglaUf ?? "UF não informada",
  );

  return (
    <section aria-labelledby="diretorio-deputados" className="mt-16 grid gap-6">
      <header className="grid max-w-[68ch] gap-2">
        <h2
          className="text-xl leading-tight font-[700] text-ink"
          id="diretorio-deputados"
        >
          Diretório de deputados
        </h2>
        <p className="text-sm leading-normal text-muted">
          Consulte todos os perfis disponíveis, agrupados pelo estado mais
          recente registrado na Câmara.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[...groups].map(([siglaUf, items]) => (
          <details className="rounded-lg border border-border" key={siglaUf}>
            <summary className="cursor-pointer px-4 py-3 text-sm font-[650] text-ink hover:bg-surface">
              {siglaUf} ({items.length})
            </summary>
            <ul className="grid gap-1 border-t border-border px-4 py-3">
              {items.map((deputado) => (
                <li key={deputado.externalIdDeputado}>
                  <Link
                    className="block rounded-sm py-1 text-sm text-info underline-offset-4 hover:underline"
                    href={buildDeputadoHref(
                      deputado.externalIdDeputado,
                      deputado.nomePublico,
                    )}
                  >
                    {deputado.nomePublico ?? "Nome não informado"}
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        ))}
      </div>
    </section>
  );
}
