import type {
  ComparativoDeputado,
  ComparativoDeputadosResponse,
  ComparativoJanela,
} from "@vota-comigo/shared-types";
import Link from "next/link";

import { HelpPopover, InlineMessage, TitleLink } from "@/shared/ui";

import { AtividadeStatus } from "./atividade-status";
import { CopyDeputadosButton } from "./copy-deputados-button";
import type { DeputadoTextItem } from "./deputados-text";
import {
  buildComparativoDeputadosGrid,
  toComparativoAviso,
  toComparativoNotaCobertura,
  type ComparativoDeputadosCell,
  type ComparativoDeputadosCellBarra,
  type ComparativoDeputadosCellLeitura,
  type ComparativoDeputadosColumn,
  type ComparativoDeputadosRow,
} from "./comparativo-deputados-grid";
import { DeputadoAvatar } from "./deputado-avatar";
import { deriveGastoCotaComparacaoEscala } from "./gasto-cota-comparacao";
import {
  DIAS_EM_EXERCICIO_INDISPONIVEL,
  JANELA_FORA_DA_BASE_COMPARAVEL,
  toDiasEmExercicioLabel,
  toJanelaPeriodoLabel,
} from "./presentation";

const labelColumnClassName =
  "sticky left-0 z-10 border-r border-b border-border bg-bg p-3";

export function ComparativoDeputadosView({
  response,
  showCopyButton = true,
}: {
  response: ComparativoDeputadosResponse;
  showCopyButton?: boolean;
}) {
  const grid = buildComparativoDeputadosGrid(response);
  const columnsById = new Map(
    grid.columns.map((column) => [column.externalIdDeputado, column]),
  );
  const gridTemplateColumns = `minmax(9rem,0.6fr) repeat(${grid.columns.length}, minmax(13rem,1fr))`;
  const aviso = toComparativoAviso(response);
  const notaCobertura = toComparativoNotaCobertura(response);

  return (
    <div className="grid gap-5">
      {aviso !== null ? (
        <InlineMessage
          body={aviso.body}
          title={aviso.title}
          tone={aviso.tone}
        />
      ) : null}

      {showCopyButton ? (
        <CopyDeputadosButton
          className="justify-self-start"
          contexto={`${response.items.length} deputados comparados`}
          deputados={response.items.map(toDeputadoTextItem)}
        />
      ) : null}

      <div className="grid gap-6 lg:hidden">
        <ComparativoPeriodoComparado columns={grid.columns} />
        <ComparativoMobile columnsById={columnsById} rows={grid.rows} />
      </div>

      <div className="hidden overflow-x-auto pb-2 lg:block">
        <div className="grid" style={{ gridTemplateColumns }}>
          <div
            className={`${labelColumnClassName} text-sm font-[650] text-muted`}
          >
            Comparação
          </div>
          {grid.columns.map((column) => (
            <ComparativoDeputadoHeader
              column={column}
              key={column.externalIdDeputado}
            />
          ))}

          {grid.rows.map((row) => (
            <ComparativoLinha key={row.id} row={row} />
          ))}
        </div>
      </div>

      {notaCobertura !== null ? (
        <p className="text-xs leading-normal text-muted justify-self-end">
          {notaCobertura}
        </p>
      ) : null}
    </div>
  );
}

function toDeputadoTextItem(item: ComparativoDeputado): DeputadoTextItem {
  return {
    externalIdDeputado: item.externalIdDeputado,
    nome: item.nomePublico,
    siglaPartido: item.snapshotPublico?.siglaPartido ?? null,
    siglaUf: item.snapshotPublico?.siglaUf ?? null,
    compatibilidade: null,
  };
}

function ComparativoIdentidade({
  column,
}: {
  column: ComparativoDeputadosColumn;
}) {
  return (
    <div className="flex items-start gap-3">
      <DeputadoAvatar nome={column.nome} urlFoto={column.urlFoto} />
      <div className="min-w-0 flex-1">
        <TitleLink
          className="block line-clamp-2 text-sm font-[650]"
          href={column.perfilHref}
        >
          {column.nome}
        </TitleLink>
        <p className="mt-1 text-xs text-muted">
          {column.siglaPartido} · {column.siglaUf}
        </p>
        <AtividadeStatus className="mt-1.5" emAtividade={column.emAtividade} />
      </div>
    </div>
  );
}

function ComparativoJanelaBloco({
  janela,
  nome,
}: {
  janela: ComparativoJanela;
  nome: string;
}) {
  return (
    <div
      aria-label={`Período comparado de ${nome}`}
      className="mt-2 border-t border-border pt-2 text-xs leading-normal text-muted"
      role="group"
    >
      {janela.status === "indisponivel" ? (
        <p>{JANELA_FORA_DA_BASE_COMPARAVEL}</p>
      ) : (
        <>
          <p>Mandato: {toJanelaPeriodoLabel(janela)}</p>
          <p>
            {janela.diasEmExercicio !== null
              ? toDiasEmExercicioLabel(janela.diasEmExercicio)
              : DIAS_EM_EXERCICIO_INDISPONIVEL}
          </p>
        </>
      )}
    </div>
  );
}

function ComparativoPeriodoComparado({
  columns,
}: {
  columns: readonly ComparativoDeputadosColumn[];
}) {
  return (
    <section className="grid gap-3">
      <h3 className="text-base font-[680] leading-snug text-ink">
        Período comparado
      </h3>
      <ul className="grid gap-2">
        {columns.map((column) => (
          <li
            className="rounded-lg border border-border bg-bg p-3"
            key={column.externalIdDeputado}
          >
            <ComparativoIdentidade column={column} />
            <ComparativoJanelaBloco janela={column.janela} nome={column.nome} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ComparativoDeputadoHeader({
  column,
}: {
  column: ComparativoDeputadosColumn;
}) {
  return (
    <div className="border-b border-border p-3">
      <ComparativoIdentidade column={column} />
      <ComparativoJanelaBloco janela={column.janela} nome={column.nome} />
    </div>
  );
}

function ComparativoLinha({ row }: { row: ComparativoDeputadosRow }) {
  return (
    <>
      <div className={labelColumnClassName}>
        <p className="flex items-center gap-2 text-sm font-[650] leading-normal text-ink">
          {row.label}
          {row.help !== null ? (
            <HelpPopover align="start" title={row.label}>
              {row.help}
            </HelpPopover>
          ) : null}
        </p>
        {row.hint !== null ? (
          <p className="mt-1 text-xs leading-normal text-muted">{row.hint}</p>
        ) : null}
      </div>

      {row.cells.map((cell) => (
        <div
          className="border-b border-border p-3"
          key={`${row.id}-${cell.externalIdDeputado}`}
        >
          <ComparativoValor cell={cell} />
        </div>
      ))}
    </>
  );
}

function ComparativoValor({ cell }: { cell: ComparativoDeputadosCell }) {
  return (
    <div className="grid gap-2">
      <p
        className={
          cell.lacuna
            ? "text-sm font-[650] leading-normal text-muted"
            : "text-lg font-[680] leading-tight tabular-nums text-ink"
        }
      >
        {cell.value}
        {cell.valueUnit !== null ? (
          <span className="ml-0.5 text-sm font-[650] text-muted">
            {cell.valueUnit}
          </span>
        ) : null}
      </p>

      {cell.barra !== null || cell.leituras !== null ? (
        <div className="grid gap-1.5">
          {cell.barra !== null ? <ComparativoBarra barra={cell.barra} /> : null}
          {cell.leituras !== null ? (
            <ComparativoLeituras leituras={cell.leituras} />
          ) : null}
        </div>
      ) : null}

      {cell.detail !== null ? (
        <p className="text-xs leading-normal text-muted">{cell.detail}</p>
      ) : null}

      <div className="grid gap-1">
        {cell.note !== null ? (
          <p className="text-xs leading-normal text-subtle">{cell.note}</p>
        ) : null}
        {cell.link !== null ? (
          <Link
            className="text-xs font-[650] leading-normal text-info underline decoration-info/35 underline-offset-[0.18em] justify-self-start"
            href={cell.link.href}
            rel="noopener noreferrer"
            target="_blank"
          >
            {cell.link.label} <span aria-hidden="true">→</span>
          </Link>
        ) : null}
      </div>
    </div>
  );
}

// A marca da leitura repete a marca da barra: é a legenda que faz o risco âmbar
// deixar de ser decoração.
function ComparativoLeituras({
  leituras,
}: {
  leituras: readonly ComparativoDeputadosCellLeitura[];
}) {
  return (
    <div className="grid max-w-[22rem] gap-0.5">
      {leituras.map((leitura) => (
        <p className="flex items-baseline gap-2" key={leitura.id}>
          <span className="sr-only">{leitura.descricao}</span>
          <span
            aria-hidden="true"
            className={`h-3 w-[3px] shrink-0 translate-y-[0.15em] rounded-full ${
              leitura.marcada ? "bg-primary" : "bg-transparent"
            }`}
          />
          <span
            aria-hidden="true"
            className="min-w-0 truncate text-xs text-muted"
          >
            {leitura.label}
          </span>
          <span
            aria-hidden="true"
            className="ml-auto text-xs font-[650] tabular-nums text-ink"
          >
            {leitura.value}
          </span>
        </p>
      ))}
    </div>
  );
}

// Mesma língua visual da barra do perfil, para onde o link da célula manda o
// usuário: trilho é o teto, preenchimento é o gasto, marca é a mediana.
function ComparativoBarra({ barra }: { barra: ComparativoDeputadosCellBarra }) {
  const escala = deriveGastoCotaComparacaoEscala(
    barra.gastoCents,
    barra.medianaCents,
    barra.tetoCents,
  );
  const [minValue, maxValue] = escala.domain;
  const toPercent = (value: number) =>
    maxValue === minValue
      ? 0
      : Math.min(
          100,
          Math.max(0, ((value - minValue) / (maxValue - minValue)) * 100),
        );
  const zero = toPercent(0);
  const gasto = toPercent(barra.gastoCents);

  return (
    <div
      aria-hidden="true"
      className="relative h-2 w-full overflow-hidden rounded-full bg-border"
      data-testid="comparativo-cota-barra"
    >
      <div
        className="absolute inset-y-0 rounded-full bg-muted"
        data-testid="comparativo-cota-barra-gasto"
        style={{
          left: `${Math.min(zero, gasto)}%`,
          width: `${Math.abs(gasto - zero)}%`,
        }}
      />
      {barra.tetoCents !== null && escala.tetoExcedido ? (
        <div
          className="absolute inset-y-0 w-0.5 bg-bg"
          data-testid="comparativo-cota-barra-teto"
          style={{
            left: `min(${toPercent(barra.tetoCents)}%, calc(100% - 2px))`,
          }}
        />
      ) : null}
      <div
        className="absolute inset-y-0 w-[3px] rounded-full bg-primary"
        data-testid="comparativo-cota-barra-mediana"
        style={{
          left: `min(${toPercent(barra.medianaCents)}%, calc(100% - 3px))`,
        }}
      />
    </div>
  );
}

function ComparativoMobile({
  columnsById,
  rows,
}: {
  columnsById: Map<number, ComparativoDeputadosColumn>;
  rows: readonly ComparativoDeputadosRow[];
}) {
  return (
    <div className="grid gap-6">
      {rows.map((row) => (
        <section className="grid gap-3" key={row.id}>
          <header className="grid gap-1">
            <h3 className="flex items-center gap-2 text-base font-[680] leading-snug text-ink">
              {row.label}
              {row.help !== null ? (
                <HelpPopover title={row.label}>{row.help}</HelpPopover>
              ) : null}
            </h3>
            {row.hint !== null ? (
              <p className="text-xs leading-normal text-muted">{row.hint}</p>
            ) : null}
          </header>

          <ul className="grid gap-2">
            {row.cells.map((cell) => (
              <ComparativoMobileValor
                cell={cell}
                column={columnsById.get(cell.externalIdDeputado)}
                key={`${row.id}-${cell.externalIdDeputado}`}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function ComparativoMobileValor({
  cell,
  column,
}: {
  cell: ComparativoDeputadosCell;
  column: ComparativoDeputadosColumn | undefined;
}) {
  if (column === undefined) return null;

  return (
    <li className="grid gap-2 rounded-lg border border-border bg-bg p-3">
      <div className="flex min-w-0 items-start gap-3">
        <DeputadoAvatar nome={column.nome} urlFoto={column.urlFoto} />
        <div className="min-w-0 flex-1">
          <TitleLink
            className="block line-clamp-2 text-sm font-[650] leading-snug"
            href={column.perfilHref}
          >
            {column.nome}
          </TitleLink>
          <p className="mt-1 text-xs text-muted">
            {column.siglaPartido} · {column.siglaUf}
          </p>
        </div>
        <AtividadeStatus className="shrink-0" emAtividade={column.emAtividade} />
      </div>

      <div className="border-t border-border pt-2">
        <ComparativoValor cell={cell} />
      </div>
    </li>
  );
}
