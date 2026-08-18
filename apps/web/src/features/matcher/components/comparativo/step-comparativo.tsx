"use client";

import type {
  DeputadoPerfil,
  EscopoMatcher,
  MatcherDeputadoDetalhe,
  MatcherDeputadoResumo,
  PosicaoMatcher,
  PosicaoUsuarioMatcher,
  SiglaUf,
} from "@vota-comigo/shared-types";
import { useState, type ReactNode } from "react";

import {
  AtividadeStatus,
  ComparativoDeputados,
  CopyDeputadosButton,
  DeputadoAvatar,
  type DeputadoTextItem,
} from "@/shared/deputado";
import { nomePublicoLabel } from "@/shared/deputado/presentation";
import {
  ProposicaoResumo,
  toIdentificadorLegislativo,
  toTextoResumo,
} from "@/shared/proposicao";
import {
  ArrowLeftIcon,
  Badge,
  Button,
  ErrorState,
  SegmentedControl,
  SkeletonRows,
  TitleLink,
} from "@/shared/ui";

import { buildComparativoDeputadosGrid } from "../../lib/comparativo-deputados-grid";
import { toCopyContextLabel } from "../../lib/matcher-presentation";
import type { MatcherStatus } from "../../lib/matcher-state";

const COMPARATIVO_VIEW_ITEMS = [
  { id: "votos", label: "Votos comparados" },
  { id: "gerais", label: "Dados gerais" },
];

const labelColumnClassName =
  "sticky left-0 z-10 border-r border-b border-border bg-bg p-3";

type StepComparativoProps = {
  deputados: MatcherDeputadoResumo[];
  detalhes: MatcherDeputadoDetalhe[];
  escopo: EscopoMatcher;
  perfis: DeputadoPerfil[];
  posicoes: PosicaoMatcher[];
  siglaUf: SiglaUf | null;
  status: MatcherStatus;
  onBack: () => void;
  onRetry: () => void;
};

export function StepComparativo({
  deputados,
  detalhes,
  escopo,
  perfis,
  posicoes,
  siglaUf,
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
  const deputadosById = new Map(
    grid.columns.map(({ deputado }) => [
      deputado.externalIdDeputado,
      toComparativoDeputadoDisplay(
        deputado,
        perfisByDeputado.get(deputado.externalIdDeputado),
      ),
    ]),
  );
  const gridTemplateColumns = `minmax(8rem,0.6fr) repeat(${grid.columns.length}, minmax(13rem,1fr))`;
  const [view, setView] = useState("votos");

  return (
    <div className="grid gap-5">
      <div>
        <Button onClick={onBack} variant="ghost">
          <ArrowLeftIcon aria-hidden />
          Voltar ao resultado
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <SegmentedControl
          activeId={view}
          className="w-full sm:w-auto"
          itemClassName="flex-1 sm:flex-none"
          items={COMPARATIVO_VIEW_ITEMS}
          label="Visualização do comparativo"
          onSelect={setView}
        />

        {status === "idle" ? (
          <CopyDeputadosButton
            className="sm:justify-end"
            contexto={toCopyContextLabel({
              escopo,
              siglaUf,
              totalProposicoes: grid.rows.length,
            })}
            deputados={[...deputadosById.values()].map(toDeputadoTextItem)}
          />
        ) : null}
      </div>

      {view === "gerais" ? (
        <ComparativoDeputados
          externalIdsDeputado={deputados.map(
            (deputado) => deputado.externalIdDeputado,
          )}
          showCopyButton={false}
        />
      ) : null}

      {view === "votos" && status === "loading" ? (
        <SkeletonRows count={5} />
      ) : null}
      {view === "votos" && status === "error" ? (
        <ErrorState
          body="Não foi possível carregar o comparativo. Tente novamente."
          onRetry={onRetry}
        />
      ) : null}

      {view === "votos" && status === "idle" ? (
        <>
          <div className="lg:hidden">
            <ComparativoMobile rows={grid.rows} deputadosById={deputadosById} />
          </div>
          <div className="hidden overflow-x-auto pb-2 lg:block">
            <div className="grid" style={{ gridTemplateColumns }}>
              <div
                className={`${labelColumnClassName} text-sm font-[650] text-muted`}
              >
                Sua posição
              </div>
              {grid.columns.map(({ deputado }) => (
                <ComparativoDeputadoHeader
                  key={deputado.externalIdDeputado}
                  deputado={deputadosById.get(deputado.externalIdDeputado)}
                />
              ))}

              {grid.rows.map((row) => (
                <ComparativoRow
                  key={row.proposicao.externalIdProposicao}
                  row={row}
                />
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

type ComparativoDeputadoDisplay = {
  deputado: MatcherDeputadoResumo;
  emAtividade: boolean;
  nome: string | null;
  siglaPartido: string | null;
  siglaUf: string | null;
  urlFoto: string | null;
};

function toComparativoDeputadoDisplay(
  deputado: MatcherDeputadoResumo,
  perfil: DeputadoPerfil | undefined,
): ComparativoDeputadoDisplay {
  const snapshot = perfil?.snapshotPublico ?? null;

  return {
    deputado,
    emAtividade: perfil?.emAtividade ?? deputado.emAtividade,
    nome: perfil ? nomePublicoLabel(perfil) : deputado.nome,
    siglaPartido: snapshot?.siglaPartido ?? deputado.partido,
    siglaUf: snapshot?.siglaUf ?? deputado.siglaUf,
    urlFoto: snapshot?.urlFoto ?? deputado.urlFoto,
  };
}

function toDeputadoTextItem(
  display: ComparativoDeputadoDisplay,
): DeputadoTextItem {
  return {
    externalIdDeputado: display.deputado.externalIdDeputado,
    nome: display.nome,
    siglaPartido: display.siglaPartido,
    siglaUf: display.siglaUf,
    compatibilidade: display.deputado.compatibilidadeBruta,
  };
}

type ComparativoDeputadoHeaderProps = {
  deputado: ComparativoDeputadoDisplay | undefined;
};

function ComparativoDeputadoHeader({
  deputado,
}: ComparativoDeputadoHeaderProps) {
  if (!deputado) return null;

  return (
    <div className="border-b border-border p-3">
      <div className="grid gap-3">
        <div className="flex items-start gap-3">
          <DeputadoAvatar nome={deputado.nome} urlFoto={deputado.urlFoto} />
          <div className="min-w-0">
            <TitleLink
              className="block line-clamp-2 text-sm font-[650]"
              href={`/deputados/${deputado.deputado.externalIdDeputado}`}
            >
              {deputado.nome ?? "Sem nome"}
            </TitleLink>
            <p className="mt-1 text-xs text-muted">
              {deputado.siglaPartido ?? "—"} · {deputado.siglaUf ?? "—"}
            </p>
            <AtividadeStatus
              className="mt-1.5"
              emAtividade={deputado.emAtividade}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

type ComparativoRowProps = {
  row: ReturnType<typeof buildComparativoDeputadosGrid>["rows"][number];
};

function ComparativoRow({ row }: ComparativoRowProps) {
  const identificador =
    toIdentificadorLegislativo(row.proposicao) ??
    `Proposta ${row.proposicao.externalIdProposicao}`;
  const textoResumo = toTextoResumo(row.proposicao);

  return (
    <>
      <div className="col-[1/-1] border-b border-border bg-bg px-3 pb-3 pt-6">
        <div className="sticky left-0 grid w-fit max-w-[65ch] gap-1">
          <TitleLink
            className="block text-base font-[680] leading-snug"
            href={`/proposicoes/${row.proposicao.externalIdProposicao}`}
          >
            {identificador}
          </TitleLink>
          {textoResumo ? (
            <ProposicaoResumo
              identificador={identificador}
              texto={textoResumo}
            />
          ) : null}
        </div>
      </div>

      <div className={labelColumnClassName}>
        <p className="text-sm font-[650] leading-normal text-ink">
          {toPosicaoUsuarioValueLabel(row.posicaoUsuario)}
        </p>
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

type ComparativoMobileProps = {
  deputadosById: Map<number, ComparativoDeputadoDisplay>;
  rows: ReturnType<typeof buildComparativoDeputadosGrid>["rows"];
};

function ComparativoMobile({ deputadosById, rows }: ComparativoMobileProps) {
  return (
    <div className="grid gap-5">
      {rows.map((row) => (
        <ComparativoMobileProposicao
          deputadosById={deputadosById}
          key={row.proposicao.externalIdProposicao}
          row={row}
        />
      ))}
    </div>
  );
}

type ComparativoMobileProposicaoProps = {
  deputadosById: Map<number, ComparativoDeputadoDisplay>;
  row: ReturnType<typeof buildComparativoDeputadosGrid>["rows"][number];
};

function ComparativoMobileProposicao({
  deputadosById,
  row,
}: ComparativoMobileProposicaoProps) {
  const identificador =
    toIdentificadorLegislativo(row.proposicao) ??
    `Proposta ${row.proposicao.externalIdProposicao}`;
  const textoResumo = toTextoResumo(row.proposicao);

  return (
    <section className="grid gap-3 border-t border-border pt-5 first:border-t-0 first:pt-0">
      <header className="grid gap-2">
        <TitleLink
          className="block text-base font-[680] leading-snug"
          href={`/proposicoes/${row.proposicao.externalIdProposicao}`}
        >
          {identificador}
        </TitleLink>
        {textoResumo ? (
          <ProposicaoResumo
            clampClassName="line-clamp-3"
            identificador={identificador}
            texto={textoResumo}
          />
        ) : null}
        <dl className="grid rounded-md border border-border bg-surface px-3 py-2 text-sm leading-normal">
          <ComparativoCellFact label="Sua posição">
            {toPosicaoUsuarioValueLabel(row.posicaoUsuario)}
          </ComparativoCellFact>
        </dl>
      </header>

      <ul className="grid gap-2">
        {row.cells.map((cell) => (
          <ComparativoMobileDeputadoVoto
            cell={cell}
            deputado={deputadosById.get(cell.externalIdDeputado)}
            key={`${row.proposicao.externalIdProposicao}-${cell.externalIdDeputado}`}
            posicaoUsuario={row.posicaoUsuario}
          />
        ))}
      </ul>
    </section>
  );
}

type ComparativoMobileDeputadoVotoProps = {
  cell: ReturnType<
    typeof buildComparativoDeputadosGrid
  >["rows"][number]["cells"][number];
  deputado: ComparativoDeputadoDisplay | undefined;
  posicaoUsuario: PosicaoUsuarioMatcher;
};

function ComparativoMobileDeputadoVoto({
  cell,
  deputado,
  posicaoUsuario,
}: ComparativoMobileDeputadoVotoProps) {
  if (!deputado) return null;

  return (
    <li className="rounded-lg border border-border bg-bg p-3">
      <div className="flex min-w-0 items-start gap-3">
        <DeputadoAvatar nome={deputado.nome} urlFoto={deputado.urlFoto} />
        <div className="min-w-0 flex-1">
          <TitleLink
            className="block line-clamp-2 text-sm font-[650] leading-snug"
            href={`/deputados/${deputado.deputado.externalIdDeputado}`}
          >
            {deputado.nome ?? "Sem nome"}
          </TitleLink>
          <p className="mt-1 text-xs text-muted">
            {deputado.siglaPartido ?? "—"} · {deputado.siglaUf ?? "—"}
          </p>
        </div>
        <Badge
          className="max-w-[8rem] shrink-0 justify-center text-center"
          tone={cell.matcherEffectVerdict.tone}
        >
          {cell.matcherEffectVerdict.label}
        </Badge>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-border pt-3 text-sm leading-normal">
        <ComparativoCellFact label="Você">
          {toPosicaoUsuarioValueLabel(posicaoUsuario)}
        </ComparativoCellFact>
        <ComparativoCellFact label="Deputado">
          {cell.situacaoLabel}
        </ComparativoCellFact>
      </dl>
    </li>
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
