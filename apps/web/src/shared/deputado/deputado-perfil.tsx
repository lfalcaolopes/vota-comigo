import type { DeputadoPerfil as DeputadoPerfilData } from "@vota-comigo/shared-types";

import { Badge, InlineMessage, SourceLink } from "@/shared/ui";

import { DeputadoAvatar } from "./deputado-avatar";
import {
  CARGO_DEPUTADO,
  HISTORICO_PARTIDARIO_INDISPONIVEL,
  RECORTE_BASE_PRESENCA,
  formatData,
  formatPercentual,
  nomePublicoLabel,
  toLegislaturaPeriodoLabel,
  toAtividadeAriaLabel,
  toAtividadeLabel,
  toAtividadeTone,
  toPeriodoPartidarioLabel,
  toPresencaAmostrasLabel,
  toPresencaAriaLabel,
  toRedeSocialLinkLabel,
  toRedeSocialNome,
} from "./presentation";

export function DeputadoPerfil({ perfil }: { perfil: DeputadoPerfilData }) {
  return (
    <div className="grid gap-8 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-x-0">
      <Identidade perfil={perfil} />
      <Evidencia perfil={perfil} />
      <Metadados perfil={perfil} />
    </div>
  );
}

function Identidade({ perfil }: { perfil: DeputadoPerfilData }) {
  const nome = nomePublicoLabel(perfil);
  const mostrarNomeCivil =
    perfil.nomeCivil !== null && perfil.nomeCivil !== perfil.nomePublico;

  const urlFoto = perfil.snapshotPublico?.urlFoto ?? null;
  const siglaPartido = perfil.snapshotPublico?.siglaPartido ?? null;
  const siglaUf = perfil.snapshotPublico?.siglaUf ?? null;

  return (
    <header className="grid gap-4 lg:col-start-1 lg:row-start-1 lg:pr-8">
      <DeputadoAvatar nome={nome} urlFoto={urlFoto} size="xl" />
      <div className="grid min-w-0 gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="neutral">{CARGO_DEPUTADO}</Badge>
          <Badge
            aria-label={toAtividadeAriaLabel(perfil.emAtividade)}
            tone={toAtividadeTone(perfil.emAtividade)}
          >
            {toAtividadeLabel(perfil.emAtividade)}
          </Badge>
        </div>
        <h1 className="text-xl leading-snug text-pretty text-ink">{nome}</h1>
        {perfil.snapshotPublicoDisponivel ? (
          <p className="text-sm text-muted">
            {siglaPartido ?? "—"} · {siglaUf ?? "—"}
          </p>
        ) : null}
        {mostrarNomeCivil ? (
          <p className="text-sm text-muted">
            Nome civil: <span className="text-ink">{perfil.nomeCivil}</span>
          </p>
        ) : null}
      </div>
    </header>
  );
}

function Evidencia({ perfil }: { perfil: DeputadoPerfilData }) {
  return (
    <div className="grid content-start gap-6 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:border-l lg:border-border lg:pl-8">
      <section className="grid gap-3">
        <h2 className="text-sm font-medium text-muted">Presença</h2>
        {perfil.resumoPresencaDisponivel && perfil.resumoPresenca !== null ? (
          <div className="grid gap-1">
            <p
              aria-label={toPresencaAriaLabel(
                perfil.resumoPresenca.percentualPresenca,
                perfil.resumoPresenca.presencas,
                perfil.resumoPresenca.totalVotacoesEmExercicio,
              )}
              className="text-4xl leading-none font-[680] tabular-nums text-ink md:text-5xl"
            >
              {formatPercentual(perfil.resumoPresenca.percentualPresenca)}
            </p>
            <p className="mt-2 text-sm text-muted">
              {toPresencaAmostrasLabel(
                perfil.resumoPresenca.presencas,
                perfil.resumoPresenca.totalVotacoesEmExercicio,
              )}
            </p>
            {perfil.resumoPresenca.ausenciasSemMotivoConhecido > 0 ? (
              <p className="text-sm text-muted">
                {perfil.resumoPresenca.ausenciasSemMotivoConhecido} ausência
                {perfil.resumoPresenca.ausenciasSemMotivoConhecido > 1
                  ? "s"
                  : ""}{" "}
                sem motivo conhecido
              </p>
            ) : null}
            <p className="mt-2 text-xs text-muted">{RECORTE_BASE_PRESENCA}</p>
          </div>
        ) : (
          <InlineMessage
            title="Presença indisponível"
            body="Não há votações nominais de plenário em exercício na base para este deputado."
          />
        )}
      </section>

      <section className="grid gap-3 border-t border-border pt-6">
        <h2 className="text-sm font-medium text-muted">Histórico partidário</h2>
        {perfil.historicoPartidarioDisponivel ? (
          <ul className="grid gap-2">
            {perfil.historicoPartidario.map((periodo) => (
              <li
                key={`${periodo.siglaPartido}-${periodo.dataInicio}`}
                className="flex flex-wrap items-center gap-2"
              >
                <span className="text-sm text-ink">{periodo.siglaPartido}</span>
                <span className="text-sm text-muted">
                  {toPeriodoPartidarioLabel(periodo)}
                </span>
                {periodo.atual ? <Badge tone="success">Atual</Badge> : null}
              </li>
            ))}
          </ul>
        ) : (
          <InlineMessage
            title="Histórico partidário indisponível"
            body={HISTORICO_PARTIDARIO_INDISPONIVEL}
          />
        )}
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

function Metadados({ perfil }: { perfil: DeputadoPerfilData }) {
  const temNaturalidade =
    perfil.municipioNascimento !== null || perfil.ufNascimento !== null;

  const temLegislatura =
    perfil.legislaturaInicialPeriodo !== null ||
    perfil.legislaturaFinalPeriodo !== null;

  const temDadosPublicos =
    temNaturalidade || perfil.dataNascimento !== null || temLegislatura;

  return (
    <aside className="grid gap-6 lg:col-start-1 lg:row-start-2 lg:pr-8">
      {temDadosPublicos ? (
        <RailSection title="Dados públicos">
          <dl className="grid gap-2">
            {temNaturalidade ? (
              <RailField term="Naturalidade">
                {[perfil.municipioNascimento, perfil.ufNascimento]
                  .filter(Boolean)
                  .join(" · ")}
              </RailField>
            ) : null}

            {perfil.dataNascimento !== null ? (
              <RailField term="Nascimento">
                {formatData(perfil.dataNascimento)}
              </RailField>
            ) : null}

            {perfil.legislaturaInicialPeriodo !== null ? (
              <RailField term="Legislatura inicial">
                {toLegislaturaPeriodoLabel(perfil.legislaturaInicialPeriodo)}
              </RailField>
            ) : null}

            {perfil.legislaturaFinalPeriodo !== null ? (
              <RailField term="Legislatura final">
                {toLegislaturaPeriodoLabel(perfil.legislaturaFinalPeriodo)}
              </RailField>
            ) : null}
          </dl>
        </RailSection>
      ) : null}

      {perfil.redesSociais.length > 0 ? (
        <RailSection title="Redes sociais">
          <ul className="grid gap-1">
            {perfil.redesSociais.map((url) => (
              <li key={url} className="min-w-0">
                <SourceLink
                  aria-label={toRedeSocialLinkLabel(url)}
                  href={url}
                  rel="noreferrer"
                  target="_blank"
                >
                  {toRedeSocialNome(url)}
                </SourceLink>
              </li>
            ))}
          </ul>
        </RailSection>
      ) : null}

      <RailSection title="Fonte oficial">
        <SourceLink href={perfil.fonteOficial} rel="noreferrer" target="_blank">
          Ver fonte oficial na Câmara
        </SourceLink>
      </RailSection>
    </aside>
  );
}

function RailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-3 border-t border-border pt-6">
      <h2 className="text-xs font-medium tracking-wide text-muted uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}

function RailField({
  term,
  children,
}: {
  term: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-0">
      <dt className="text-sm text-muted">{term}</dt>
      <dd className="text-sm text-ink">{children}</dd>
    </div>
  );
}
