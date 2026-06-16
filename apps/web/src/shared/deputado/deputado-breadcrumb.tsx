import type { DeputadoPerfil as DeputadoPerfilData } from "@vota-comigo/shared-types";
import Link from "next/link";

import { nomePublicoLabel } from "./presentation";

export function DeputadoBreadcrumb({ perfil }: { perfil: DeputadoPerfilData }) {
  return (
    <nav
      aria-label="Trilha de navegação"
      className="flex flex-wrap items-center gap-2 text-sm text-subtle"
    >
      <Link
        href="/"
        className="text-muted underline-offset-2 hover:text-ink hover:underline"
      >
        Início
      </Link>
      <span aria-hidden="true">›</span>
      <span className="min-w-0 [overflow-wrap:anywhere] text-muted">
        {nomePublicoLabel(perfil)}
      </span>
    </nav>
  );
}
