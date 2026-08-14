import type { ComparativoDeputadosResponse } from "@vota-comigo/shared-types";
import Link from "next/link";

import { Badge } from "@/shared/ui";

import {
  buildComparativoDeputadosGrid,
  type ComparativoDeputadosCell,
  type ComparativoDeputadosColumn,
  type ComparativoDeputadosRow,
} from "./comparativo-deputados-grid";
import { DeputadoAvatar } from "./deputado-avatar";
import { toAtividadeAriaLabel, toAtividadeLabel } from "./presentation";

const labelColumnClassName =
  "sticky left-0 z-10 border-r border-b border-border bg-bg p-3";

export function ComparativoDeputadosView({
  response,
}: {
  response: ComparativoDeputadosResponse;
}) {
  const grid = buildComparativoDeputadosGrid(response);
  const columnsById = new Map(
    grid.columns.map((column) => [column.externalIdDeputado, column]),
  );
  const gridTemplateColumns = `minmax(9rem,0.6fr) repeat(${grid.columns.length}, minmax(13rem,1fr))`;

  return (
    <div className="grid gap-5">
      {response.year === null ? (
        <p className="text-sm text-muted">
          Os mandatos comparados não têm nenhum ano em comum, então só a
          identidade e a presença aparecem lado a lado.
        </p>
      ) : null}

      <div className="lg:hidden">
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
    </div>
  );
}

function ComparativoDeputadoHeader({
  column,
}: {
  column: ComparativoDeputadosColumn;
}) {
  return (
    <div className="border-b border-border p-3">
      <div className="flex items-start gap-3">
        <DeputadoAvatar nome={column.nome} urlFoto={column.urlFoto} />
        <div className="min-w-0">
          <Link
            className="block line-clamp-2 break-words text-sm font-[650] text-ink underline decoration-transparent underline-offset-[0.18em] transition-[text-decoration-color] duration-[180ms] ease-standard hover:decoration-current"
            href={column.perfilHref}
            rel="noopener noreferrer"
            target="_blank"
          >
            {column.nome}
          </Link>
          <p className="mt-1 text-xs text-muted">
            {column.siglaPartido} · {column.siglaUf}
          </p>
          <Badge
            aria-label={toAtividadeAriaLabel(column.emAtividade)}
            className="mt-1.5"
            tone={column.emAtividade ? "success" : "neutral"}
          >
            {toAtividadeLabel(column.emAtividade)}
          </Badge>
        </div>
      </div>
    </div>
  );
}

function ComparativoLinha({ row }: { row: ComparativoDeputadosRow }) {
  return (
    <>
      <div className={labelColumnClassName}>
        <p className="text-sm font-[650] leading-normal text-ink">
          {row.label}
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
    <div className="grid gap-1">
      <p
        className={
          cell.lacuna
            ? "text-sm font-[650] leading-normal text-muted"
            : "text-lg font-[680] leading-tight tabular-nums text-ink"
        }
      >
        {cell.value}
      </p>
      {cell.detail !== null ? (
        <p className="text-xs leading-normal text-muted">{cell.detail}</p>
      ) : null}
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
            <h3 className="text-base font-[680] leading-snug text-ink">
              {row.label}
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
          <Link
            className="block line-clamp-2 break-words text-sm font-[650] leading-snug text-ink underline decoration-transparent underline-offset-[0.18em] transition-[text-decoration-color] duration-[180ms] ease-standard hover:decoration-current"
            href={column.perfilHref}
            rel="noopener noreferrer"
            target="_blank"
          >
            {column.nome}
          </Link>
          <p className="mt-1 text-xs text-muted">
            {column.siglaPartido} · {column.siglaUf}
          </p>
        </div>
        <Badge
          aria-label={toAtividadeAriaLabel(column.emAtividade)}
          className="shrink-0"
          tone={column.emAtividade ? "success" : "neutral"}
        >
          {toAtividadeLabel(column.emAtividade)}
        </Badge>
      </div>

      <div className="border-t border-border pt-2">
        <ComparativoValor cell={cell} />
      </div>
    </li>
  );
}
