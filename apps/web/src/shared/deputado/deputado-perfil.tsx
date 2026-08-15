import type { DeputadoPerfil as DeputadoPerfilData } from "@vota-comigo/shared-types";

import { Badge, InlineMessage, SourceLink } from "@/shared/ui";
import { joinClassNames } from "@/shared/ui/utils";

import { DeputadoAvatar } from "./deputado-avatar";
import { DeputadoAtuacao } from "./deputado-atuacao";
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

export function DeputadoPerfil({
  perfil,
  initialYear = perfil.defaultYear,
}: {
  perfil: DeputadoPerfilData;
  initialYear?: number | null;
}) {
  const hasAnnualData = initialYear !== null && perfil.validYearRange !== null;

  return (
    <div className="grid gap-10 md:gap-12">
      <Identity perfil={perfil} />
      <ProfileNavigation hasAnnualData={hasAnnualData} />
      <Overview perfil={perfil} />
      {hasAnnualData &&
      initialYear !== null &&
      perfil.validYearRange !== null ? (
        <DeputadoAtuacao
          externalIdDeputado={perfil.externalIdDeputado}
          initialYear={initialYear}
          key={perfil.externalIdDeputado}
          validYearRange={perfil.validYearRange}
        />
      ) : null}
    </div>
  );
}

function Identity({ perfil }: { perfil: DeputadoPerfilData }) {
  const nome = nomePublicoLabel(perfil);
  const mostrarNomeCivil =
    perfil.nomeCivil !== null && perfil.nomeCivil !== perfil.nomePublico;

  const urlFoto = perfil.snapshotPublico?.urlFoto ?? null;
  const siglaPartido = perfil.snapshotPublico?.siglaPartido ?? null;
  const siglaUf = perfil.snapshotPublico?.siglaUf ?? null;
  const hasPublicDetails =
    perfil.municipioNascimento !== null ||
    perfil.ufNascimento !== null ||
    perfil.dataNascimento !== null ||
    perfil.legislaturaInicialPeriodo !== null ||
    perfil.legislaturaFinalPeriodo !== null;

  return (
    <header
      className={joinClassNames(
        "grid gap-5 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-start sm:gap-6",
        hasPublicDetails
          ? "lg:grid-cols-[auto_minmax(0,1fr)_minmax(16rem,0.75fr)] lg:gap-8"
          : "lg:grid-cols-[auto_minmax(0,1fr)]",
      )}
    >
      <DeputadoAvatar loading="eager" nome={nome} urlFoto={urlFoto} size="xl" />
      <div className="grid min-w-0 gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="neutral">{CARGO_DEPUTADO}</Badge>
          <Badge
            aria-label={toAtividadeAriaLabel(perfil.emAtividade)}
            tone={toAtividadeTone(perfil.emAtividade)}
          >
            {toAtividadeLabel(perfil.emAtividade)}
          </Badge>
        </div>
        <h1 className="text-2xl leading-tight font-[700] text-pretty text-ink md:text-3xl">
          {nome}
        </h1>
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
        <div className="grid gap-2 pt-1">
          <div>
            <SourceLink
              href={perfil.fonteOficial}
              rel="noreferrer"
              target="_blank"
            >
              Consultar perfil oficial na Câmara
            </SourceLink>
          </div>
          {perfil.redesSociais.length > 0 ? (
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-sm text-muted">Redes sociais:</span>
              <ul className="flex flex-wrap gap-x-3 gap-y-2">
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
            </div>
          ) : null}
        </div>
      </div>
      {hasPublicDetails ? <IdentityDetails perfil={perfil} /> : null}
    </header>
  );
}

function IdentityDetails({ perfil }: { perfil: DeputadoPerfilData }) {
  const hasBirthplace =
    perfil.municipioNascimento !== null || perfil.ufNascimento !== null;
  const initialLegislatura =
    perfil.legislaturaInicialPeriodo === null
      ? null
      : toLegislaturaPeriodoLabel(perfil.legislaturaInicialPeriodo);
  const finalLegislatura =
    perfil.legislaturaFinalPeriodo === null
      ? null
      : toLegislaturaPeriodoLabel(perfil.legislaturaFinalPeriodo);

  return (
    <section
      aria-labelledby="dados-publicos-title"
      className="grid content-start gap-3 border-t border-border pt-5 sm:col-span-2 lg:col-span-1 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8"
    >
      <h2 className="text-sm font-[680] text-ink" id="dados-publicos-title">
        Dados públicos
      </h2>
      <dl className="grid gap-2">
        {hasBirthplace ? (
          <IdentityField term="Naturalidade">
            {[perfil.municipioNascimento, perfil.ufNascimento]
              .filter(Boolean)
              .join(" · ")}
          </IdentityField>
        ) : null}
        {perfil.dataNascimento !== null ? (
          <IdentityField term="Nascimento">
            {formatData(perfil.dataNascimento)}
          </IdentityField>
        ) : null}
        <LegislaturaField
          finalLegislatura={finalLegislatura}
          initialLegislatura={initialLegislatura}
        />
      </dl>
    </section>
  );
}

function LegislaturaField({
  initialLegislatura,
  finalLegislatura,
}: {
  initialLegislatura: string | null;
  finalLegislatura: string | null;
}) {
  if (initialLegislatura !== null && initialLegislatura === finalLegislatura) {
    return (
      <IdentityField term="Legislatura">{initialLegislatura}</IdentityField>
    );
  }

  if (initialLegislatura !== null && finalLegislatura !== null) {
    return (
      <IdentityField term="Legislaturas">
        {initialLegislatura} e {finalLegislatura}
      </IdentityField>
    );
  }

  if (initialLegislatura !== null) {
    return (
      <IdentityField term="Legislatura inicial">
        {initialLegislatura}
      </IdentityField>
    );
  }

  if (finalLegislatura !== null) {
    return (
      <IdentityField term="Legislatura final">{finalLegislatura}</IdentityField>
    );
  }

  return null;
}

function ProfileNavigation({ hasAnnualData }: { hasAnnualData: boolean }) {
  return (
    <nav
      aria-label="Seções do perfil"
      className="overflow-x-auto px-4 border-t border-border -mx-4 sm:mx-0 sm:px-0"
    >
      <ul className="flex min-w-max items-center gap-1 border-b border-border py-2">
        <NavigationItem href="#visao-geral">Visão geral</NavigationItem>
        {hasAnnualData ? (
          <>
            <NavigationItem href="#atuacao">Atuação</NavigationItem>
            <NavigationItem href="#gastos">Gastos</NavigationItem>
            <NavigationItem href="#comissoes">Comissões</NavigationItem>
          </>
        ) : null}
      </ul>
    </nav>
  );
}

function NavigationItem({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <li>
      <a
        className="flex min-h-11 items-center rounded-md px-3 text-sm font-[650] text-muted transition-colors duration-[140ms] ease-standard hover:bg-surface-muted hover:text-ink"
        href={href}
      >
        {children}
      </a>
    </li>
  );
}

function Overview({ perfil }: { perfil: DeputadoPerfilData }) {
  const [periodoRecente, ...periodosAnteriores] = perfil.historicoPartidario;

  return (
    <section
      aria-labelledby="visao-geral-title"
      className="grid scroll-mt-20 gap-6 md:scroll-mt-24"
      id="visao-geral"
    >
      <div className="grid max-w-[70ch] gap-2">
        <h2
          className="text-xl leading-snug font-[680] text-ink"
          id="visao-geral-title"
        >
          Visão geral
        </h2>
        <p className="text-sm leading-normal text-muted">
          Presença nas votações consideradas pelo produto e trajetória
          partidária registrada pela Câmara.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-0">
        <section className="grid content-start gap-3 lg:pr-10">
          <h3 className="text-base font-[680] text-ink">Presença registrada</h3>
          {perfil.resumoPresencaDisponivel && perfil.resumoPresenca !== null ? (
            <div className="grid gap-3">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <p
                  aria-label={toPresencaAriaLabel(
                    perfil.resumoPresenca.percentualPresenca,
                    perfil.resumoPresenca.presencas,
                    perfil.resumoPresenca.totalVotacoesEmExercicio,
                  )}
                  className="text-3xl leading-none font-[680] tabular-nums text-ink"
                >
                  {formatPercentual(perfil.resumoPresenca.percentualPresenca)}
                </p>
                <p className="text-sm text-muted">
                  {toPresencaAmostrasLabel(
                    perfil.resumoPresenca.presencas,
                    perfil.resumoPresenca.totalVotacoesEmExercicio,
                  )}
                </p>
              </div>
              {perfil.resumoPresenca.ausenciasSemMotivoConhecido > 0 ? (
                <p className="text-sm text-muted">
                  {perfil.resumoPresenca.ausenciasSemMotivoConhecido} ausência
                  {perfil.resumoPresenca.ausenciasSemMotivoConhecido > 1
                    ? "s"
                    : ""}{" "}
                  sem motivo conhecido
                </p>
              ) : null}
              <p className="max-w-[65ch] text-sm leading-normal text-muted">
                {RECORTE_BASE_PRESENCA}
              </p>
            </div>
          ) : (
            <InlineMessage
              title="Presença indisponível"
              body="Ainda não há votações de plenário com voto registrado para este deputado."
            />
          )}
        </section>

        <section className="grid content-start gap-3 border-t border-border pt-8 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-10">
          <h3 className="text-base font-[680] text-ink">
            Histórico partidário
          </h3>
          {perfil.historicoPartidarioDisponivel &&
          periodoRecente !== undefined ? (
            <div className="grid gap-3">
              <PeriodoPartidario
                label={perfil.emAtividade ? "Atual" : "Último registro"}
                periodo={periodoRecente}
              />
              {periodosAnteriores.length > 0 ? (
                <details className="group grid gap-3">
                  <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-[650] text-muted transition-colors duration-[140ms] ease-standard marker:content-none hover:text-ink group-open:hidden">
                    Ver histórico completo <DisclosureChevron />
                  </summary>
                  <ul className="grid gap-2">
                    {periodosAnteriores.map((periodo) => (
                      <li key={`${periodo.siglaPartido}-${periodo.dataInicio}`}>
                        <PeriodoPartidario periodo={periodo} />
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </div>
          ) : (
            <InlineMessage
              title="Histórico partidário indisponível"
              body={HISTORICO_PARTIDARIO_INDISPONIVEL}
            />
          )}
        </section>
      </div>

      {perfil.historicoParlamentarDisponivel ? null : (
        <InlineMessage
          title="Sem histórico parlamentar"
          body="Este deputado está cadastrado, mas ainda não há histórico parlamentar na base para exibir snapshot atual, presença e histórico partidário."
        />
      )}
    </section>
  );
}

function DisclosureChevron() {
  return (
    <svg
      aria-hidden="true"
      className="size-4 shrink-0"
      fill="none"
      viewBox="0 0 20 20"
    >
      <path
        d="m5 7.5 5 5 5-5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function PeriodoPartidario({
  periodo,
  label,
}: {
  periodo: DeputadoPerfilData["historicoPartidario"][number];
  label?: "Atual" | "Último registro";
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-ink">{periodo.siglaPartido}</span>
      <span className="text-sm text-muted">
        {toPeriodoPartidarioLabel(periodo)}
      </span>
      {label !== undefined ? (
        <Badge tone={label === "Atual" ? "success" : "neutral"}>{label}</Badge>
      ) : null}
    </div>
  );
}

function IdentityField({
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
