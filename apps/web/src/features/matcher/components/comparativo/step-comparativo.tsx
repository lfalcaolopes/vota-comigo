import type {
  DeputadoPerfil,
  MatcherDeputadoDetalhe,
  MatcherDeputadoResumo,
  PosicaoMatcher,
  PosicaoUsuarioMatcher,
} from "@vota-comigo/shared-types";
import Link from "next/link";
import type { ReactNode } from "react";

import { DeputadoAvatar } from "@/shared/deputado";
import {
  RECORTE_BASE_PRESENCA,
  formatPercentual,
  nomePublicoLabel,
  toAtividadeAriaLabel,
  toAtividadeLabel,
  toPresencaAmostrasLabel,
  toPresencaAriaLabel,
} from "@/shared/deputado/presentation";
import { toIdentificadorLegislativo } from "@/shared/proposicao";
import {
  Badge,
  Button,
  ErrorState,
  InlineMessage,
  SkeletonRows,
} from "@/shared/ui";

import { buildComparativoDeputadosGrid } from "../../lib/comparativo-deputados-grid";
import type { MatcherStatus } from "../../lib/matcher-state";

const labelColumnClassName =
  "sticky left-0 z-10 border-r border-b border-border bg-bg p-3";

type StepComparativoProps = {
  deputados: MatcherDeputadoResumo[];
  detalhes: MatcherDeputadoDetalhe[];
  perfis: DeputadoPerfil[];
  posicoes: PosicaoMatcher[];
  status: MatcherStatus;
  onBack: () => void;
  onRetry: () => void;
};

export function StepComparativo({
  deputados,
  detalhes,
  perfis,
  posicoes,
  status,
  onBack,
  onRetry,
}: StepComparativoProps) {
  const grid = buildComparativoDeputadosGrid({
    selectedDeputados: deputados,
    detalhes,
    posicoes,
  });
  const perfisByDeputado = new Map(
    perfis.map((perfil) => [perfil.externalIdDeputado, perfil]),
  );
  const gridTemplateColumns = `minmax(12rem,1.1fr) repeat(${grid.columns.length}, minmax(13rem,1fr))`;

  return (
    <div className="grid gap-5">
      <div>
        <Button onClick={onBack} variant="secondary">
          Voltar ao resultado
        </Button>
      </div>

      {status === "loading" ? <SkeletonRows count={5} /> : null}
      {status === "error" ? (
        <ErrorState
          body="Não foi possível carregar o comparativo. Tente novamente."
          onRetry={onRetry}
        />
      ) : null}

      {status === "idle" ? (
        <>
          <p
            className="text-sm leading-normal text-muted lg:hidden"
            role="status"
          >
            Role na horizontal para ver todos os deputados.
          </p>
          <div className="overflow-x-auto pb-2">
            <div className="grid" style={{ gridTemplateColumns }}>
              <div
                className={`${labelColumnClassName} text-sm font-[650] text-muted`}
              >
                Proposição
              </div>
              {grid.columns.map(({ deputado }) => (
                <ComparativoDeputadoHeader
                  deputado={deputado}
                  key={deputado.externalIdDeputado}
                  perfil={perfisByDeputado.get(deputado.externalIdDeputado)}
                />
              ))}

              {grid.rows.map((row) => (
                <ComparativoRow
                  key={row.proposicao.externalIdProposicao}
                  row={row}
                />
              ))}

              <div className={labelColumnClassName}>
                <p className="text-sm font-[650] text-ink">Presença</p>
                <p className="mt-1 text-xs leading-normal text-muted">
                  Mesmo recorte do Perfil do deputado.
                </p>
              </div>
              {grid.columns.map(({ deputado }) => (
                <ComparativoPresencaCell
                  key={`presenca-${deputado.externalIdDeputado}`}
                  perfil={perfisByDeputado.get(deputado.externalIdDeputado)}
                />
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

type ComparativoDeputadoHeaderProps = {
  deputado: MatcherDeputadoResumo;
  perfil: DeputadoPerfil | undefined;
};

function ComparativoDeputadoHeader({
  deputado,
  perfil,
}: ComparativoDeputadoHeaderProps) {
  const nome = perfil ? nomePublicoLabel(perfil) : deputado.nome;
  const snapshot = perfil?.snapshotPublico ?? null;
  const siglaPartido = snapshot?.siglaPartido ?? deputado.partido ?? "—";
  const siglaUf = snapshot?.siglaUf ?? deputado.siglaUf ?? "—";
  const urlFoto = snapshot?.urlFoto ?? deputado.urlFoto;
  const emAtividade = perfil?.emAtividade ?? deputado.emAtividade;

  return (
    <div className="border-b border-border p-3">
      <div className="grid gap-3">
        <div className="flex items-start gap-3">
          <DeputadoAvatar nome={nome} urlFoto={urlFoto} />
          <div className="min-w-0">
            <Link
              className="block line-clamp-2 break-words text-sm font-[650] text-ink underline decoration-transparent underline-offset-[0.18em] transition-[text-decoration-color] duration-[180ms] ease-standard hover:decoration-current"
              href={`/deputados/${deputado.externalIdDeputado}`}
              rel="noopener noreferrer"
              target="_blank"
            >
              {nome ?? "Sem nome"}
            </Link>
            <p className="mt-1 text-xs text-muted">
              {siglaPartido} · {siglaUf}
            </p>
            <ComparativoAtividadeStatus emAtividade={emAtividade} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ComparativoAtividadeStatus({
  emAtividade,
}: {
  emAtividade: boolean;
}) {
  return (
    <span
      aria-label={toAtividadeAriaLabel(emAtividade)}
      className="mt-1.5 inline-flex max-w-full items-center gap-1.5 text-xs font-[560] leading-normal text-muted [overflow-wrap:anywhere]"
    >
      <span
        aria-hidden="true"
        className={`size-1.5 shrink-0 rounded-full ${
          emAtividade ? "bg-success ring-1 ring-success/35" : "bg-subtle"
        }`}
      />
      {toAtividadeLabel(emAtividade)}
    </span>
  );
}

type ComparativoRowProps = {
  row: ReturnType<typeof buildComparativoDeputadosGrid>["rows"][number];
};

function ComparativoRow({ row }: ComparativoRowProps) {
  const identificador =
    toIdentificadorLegislativo(row.proposicao) ??
    `Proposição ${row.proposicao.externalIdProposicao}`;

  return (
    <>
      <div className={labelColumnClassName}>
        <Link
          className="block break-words text-sm font-[650] text-ink underline decoration-transparent underline-offset-[0.18em] transition-[text-decoration-color] duration-[180ms] ease-standard hover:decoration-current"
          href={`/proposicoes/${row.proposicao.externalIdProposicao}`}
          rel="noopener noreferrer"
          target="_blank"
        >
          {identificador}
        </Link>
        {row.proposicao.ementa ? (
          <p className="mt-1 line-clamp-2 text-sm leading-normal text-muted">
            {row.proposicao.ementa}
          </p>
        ) : null}
      </div>

      {row.cells.map((cell) => (
        <div
          className="border-b border-border p-3"
          key={`${row.proposicao.externalIdProposicao}-${cell.externalIdDeputado}`}
        >
          <div className="grid gap-2">
            <Badge
              className="justify-self-start"
              tone={cell.matcherEffectVerdict.tone}
            >
              {cell.matcherEffectVerdict.label}
            </Badge>
            <dl className="grid gap-1 text-sm leading-normal">
              <ComparativoCellFact label="Você">
                {toPosicaoUsuarioValueLabel(row.posicaoUsuario)}
              </ComparativoCellFact>
              <ComparativoCellFact label="Deputado">
                {cell.situacaoLabel}
              </ComparativoCellFact>
            </dl>
          </div>
        </div>
      ))}
    </>
  );
}

function toPosicaoUsuarioValueLabel(posicao: PosicaoUsuarioMatcher): string {
  if (posicao === "aprovar") return "Sim";
  if (posicao === "rejeitar") return "Não";
  return "Não sei";
}

function ComparativoCellFact({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <div className="grid min-w-0 gap-0.5">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="break-words font-[650] text-ink">{children}</dd>
    </div>
  );
}

function ComparativoPresencaCell({
  perfil,
}: {
  perfil: DeputadoPerfil | undefined;
}) {
  const resumo = perfil?.resumoPresenca ?? null;

  if (!perfil?.resumoPresencaDisponivel || resumo === null) {
    return (
      <div className="border-b border-border p-3">
        <InlineMessage
          body="Não há votações nominais de plenário em exercício na base para este deputado."
          title="Presença indisponível"
        />
      </div>
    );
  }

  return (
    <div className="border-b border-border p-3">
      <div className="grid gap-1">
        <p
          aria-label={toPresencaAriaLabel(
            resumo.percentualPresenca,
            resumo.presencas,
            resumo.totalVotacoesEmExercicio,
          )}
          className="text-lg font-[680] leading-tight tabular-nums text-ink"
        >
          {formatPercentual(resumo.percentualPresenca)}
        </p>
        <p className="text-sm leading-normal text-muted">
          {toPresencaAmostrasLabel(
            resumo.presencas,
            resumo.totalVotacoesEmExercicio,
          )}
        </p>
        {resumo.ausenciasSemMotivoConhecido > 0 ? (
          <p className="text-sm leading-normal text-muted">
            {resumo.ausenciasSemMotivoConhecido} ausência
            {resumo.ausenciasSemMotivoConhecido > 1 ? "s" : ""} sem motivo
            conhecido
          </p>
        ) : null}
        <p className="mt-1 text-xs leading-normal text-subtle">
          {RECORTE_BASE_PRESENCA}
        </p>
      </div>
    </div>
  );
}
