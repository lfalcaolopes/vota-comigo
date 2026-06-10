import type { ProposicaoDetalhe } from "@vota-comigo/shared-types";
import Link from "next/link";

import { toIdentificadorLegislativo } from "./presentation";

export function ProposicaoBreadcrumb({
  proposicao,
}: {
  proposicao: Pick<ProposicaoDetalhe, "siglaTipo" | "numero" | "ano">;
}) {
  const identificador = toIdentificadorLegislativo(proposicao);

  return (
    <nav
      aria-label="Trilha de navegação"
      className="flex flex-wrap items-center gap-2 text-sm text-subtle"
    >
      <Link
        href="/"
        className="text-muted underline-offset-2 hover:text-ink hover:underline"
      >
        Proposições
      </Link>
      <span aria-hidden="true">›</span>
      <span className="font-mono text-muted">
        {identificador ?? "Sem identificador"}
      </span>
    </nav>
  );
}
