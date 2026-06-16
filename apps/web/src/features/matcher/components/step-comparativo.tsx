import type {
  MatcherDeputadoDetalhe,
  MatcherDeputadoResumo,
  PosicaoMatcher,
} from "@vota-comigo/shared-types";
import Link from "next/link";
import type { ReactNode } from "react";

import { toIdentificadorLegislativo } from "@/shared/proposicao";
import { Badge, Button, ErrorState, SkeletonRows } from "@/shared/ui";

import { buildComparativoDeputadosGrid } from "../lib/comparativo-deputados-grid";
import type { MatcherStatus } from "../lib/matcher-state";
import { DeputadoAvatar } from "./deputado-avatar";

type StepComparativoProps = {
  deputados: MatcherDeputadoResumo[];
  detalhes: MatcherDeputadoDetalhe[];
  posicoes: PosicaoMatcher[];
  status: MatcherStatus;
  onBack: () => void;
  onRetry: () => void;
};

export function StepComparativo({
  deputados,
  detalhes,
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
  const gridTemplateColumns = `minmax(16rem,1.25fr) repeat(${grid.columns.length}, minmax(11rem,1fr))`;

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
        <div className="overflow-x-auto pb-2">
          <div className="grid min-w-[42rem]" style={{ gridTemplateColumns }}>
            <div className="border-b border-border p-3 text-sm font-[650] text-muted">
              Proposição
            </div>
            {grid.columns.map(({ deputado }) => (
              <div
                className="border-b border-border p-3"
                key={deputado.externalIdDeputado}
              >
                <div className="flex items-center gap-3">
                  <DeputadoAvatar
                    nome={deputado.nome}
                    urlFoto={deputado.urlFoto}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-[650] text-ink">
                      {deputado.nome ?? "Sem nome"}
                    </p>
                    <p className="text-xs text-muted">
                      {deputado.partido ?? "—"} · {deputado.siglaUf}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {grid.rows.map((row) => (
              <ComparativoRow
                key={row.proposicao.externalIdProposicao}
                row={row}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
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
      <div className="border-b border-border p-3">
        <Link
          className="text-sm font-[650] text-ink underline decoration-transparent underline-offset-[0.18em] transition-[text-decoration-color] duration-[180ms] ease-standard hover:decoration-current"
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
        <dl className="mt-3 grid gap-1.5 text-xs">
          <MetaItem label="Sua posição">{row.posicaoUsuarioLabel}</MetaItem>
        </dl>
      </div>

      {row.cells.map((cell) => (
        <div
          className="border-b border-border p-3"
          key={`${row.proposicao.externalIdProposicao}-${cell.externalIdDeputado}`}
        >
          <div className="grid gap-2">
            <Badge tone={cell.matcherEffectVerdict.tone}>
              {cell.matcherEffectVerdict.label}
            </Badge>
            <p className="text-sm font-[650] text-ink">{cell.situacaoLabel}</p>
          </div>
        </div>
      ))}
    </>
  );
}

function MetaItem({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <div className="flex min-w-0 items-baseline gap-2">
      <dt className="text-muted">{label}</dt>
      <dd className="font-[650] text-ink">{children}</dd>
    </div>
  );
}
