import type { DeputadoPerfil as DeputadoPerfilData } from "@vota-comigo/shared-types";

import { Badge, InlineMessage, SourceLink } from "@/shared/ui";

import { CARGO_DEPUTADO, nomePublicoLabel } from "./presentation";

export function DeputadoPerfil({ perfil }: { perfil: DeputadoPerfilData }) {
  const nome = nomePublicoLabel(perfil);
  const mostrarNomeCivil =
    perfil.nomeCivil !== null && perfil.nomeCivil !== perfil.nomePublico;

  return (
    <div className="grid gap-8">
      <header className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="neutral">{CARGO_DEPUTADO}</Badge>
        </div>
        <h1 className="text-xl leading-snug text-pretty text-ink md:text-2xl">
          {nome}
        </h1>
        {mostrarNomeCivil ? (
          <p className="text-sm text-muted">
            Nome civil: <span className="text-ink">{perfil.nomeCivil}</span>
          </p>
        ) : null}
      </header>

      <section className="grid gap-3 border-t border-border pt-6">
        <h2 className="text-xs font-medium tracking-wide text-subtle uppercase">
          Fonte oficial
        </h2>
        <SourceLink href={perfil.fonteOficial} rel="noreferrer" target="_blank">
          Ver fonte oficial na Câmara
        </SourceLink>
      </section>

      {perfil.historicoParlamentarDisponivel ? null : (
        <InlineMessage
          title="Sem histórico parlamentar"
          body="Este deputado está cadastrado, mas ainda não há histórico parlamentar na base para exibir snapshot atual, presença e histórico partidário."
        />
      )}
    </div>
  );
}
