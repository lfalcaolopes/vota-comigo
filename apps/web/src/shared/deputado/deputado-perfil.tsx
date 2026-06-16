import type { DeputadoPerfil as DeputadoPerfilData } from "@vota-comigo/shared-types";

import { Badge, InlineMessage, SourceLink } from "@/shared/ui";

import { DeputadoAvatar } from "./deputado-avatar";
import {
  CARGO_DEPUTADO,
  nomePublicoLabel,
  toAtividadeLabel,
  toAtividadeTone,
} from "./presentation";

export function DeputadoPerfil({ perfil }: { perfil: DeputadoPerfilData }) {
  const nome = nomePublicoLabel(perfil);
  const mostrarNomeCivil =
    perfil.nomeCivil !== null && perfil.nomeCivil !== perfil.nomePublico;

  const urlFoto = perfil.snapshotPublico?.urlFoto ?? null;
  const siglaPartido = perfil.snapshotPublico?.siglaPartido ?? null;
  const siglaUf = perfil.snapshotPublico?.siglaUf ?? null;

  const atividadeLabel = toAtividadeLabel(perfil.emAtividade);
  const atividadeTone = toAtividadeTone(perfil.emAtividade);

  const temNascimento =
    perfil.dataNascimento !== null ||
    perfil.municipioNascimento !== null ||
    perfil.ufNascimento !== null;

  const temLegislatura =
    perfil.externalIdLegislaturaInicial !== null ||
    perfil.externalIdLegislaturaFinal !== null;

  return (
    <div className="grid gap-8">
      <header className="grid gap-3">
        <div className="flex items-center gap-3">
          <DeputadoAvatar nome={nome} urlFoto={urlFoto} size="lg" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="neutral">{CARGO_DEPUTADO}</Badge>
              <Badge tone={atividadeTone}>{atividadeLabel}</Badge>
            </div>
            <h1 className="mt-1 text-xl leading-snug text-pretty text-ink md:text-2xl">
              {nome}
            </h1>
            {perfil.snapshotPublicoDisponivel ? (
              <p className="text-sm text-muted">
                {siglaPartido ?? "—"} · {siglaUf ?? "—"}
              </p>
            ) : null}
          </div>
        </div>

        {mostrarNomeCivil ? (
          <p className="text-sm text-muted">
            Nome civil: <span className="text-ink">{perfil.nomeCivil}</span>
          </p>
        ) : null}
      </header>

      {perfil.redesSociais.length > 0 ? (
        <section className="grid gap-3 border-t border-border pt-6">
          <h2 className="text-xs font-medium tracking-wide text-subtle uppercase">
            Redes sociais
          </h2>
          <ul className="grid gap-1">
            {perfil.redesSociais.map((url) => (
              <li key={url}>
                <SourceLink href={url} rel="noreferrer" target="_blank">
                  {url}
                </SourceLink>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {temNascimento || temLegislatura ? (
        <section className="grid gap-3 border-t border-border pt-6">
          <h2 className="text-xs font-medium tracking-wide text-subtle uppercase">
            Dados públicos
          </h2>
          <dl className="grid gap-2">
            {temNascimento ? (
              <div className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-0">
                <dt className="text-sm text-muted">Nascimento</dt>
                <dd className="text-sm text-ink">
                  {[
                    perfil.municipioNascimento,
                    perfil.ufNascimento,
                    perfil.dataNascimento,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </dd>
              </div>
            ) : null}

            {perfil.externalIdLegislaturaInicial !== null ? (
              <div className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-0">
                <dt className="text-sm text-muted">Legislatura inicial</dt>
                <dd className="text-sm text-ink">
                  {perfil.externalIdLegislaturaInicial}
                </dd>
              </div>
            ) : null}

            {perfil.externalIdLegislaturaFinal !== null ? (
              <div className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-0">
                <dt className="text-sm text-muted">Legislatura final</dt>
                <dd className="text-sm text-ink">
                  {perfil.externalIdLegislaturaFinal}
                </dd>
              </div>
            ) : null}
          </dl>
        </section>
      ) : null}

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
