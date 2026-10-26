"use client";

import type { KeyboardEvent } from "react";
import { useState } from "react";

import { joinClassNames } from "@/shared/ui/utils";

import {
  formatPercent,
  formatUfLabel,
  formatUfNome,
  formatVotosCompact,
  toMapaFill,
  toMapaFillColor,
} from "../lib/apuracao-presentation";
import type { UfShape } from "../lib/mapa-ufs";
import type { ResultadoUf } from "../lib/resultado-apuracao";
import { SplitBar } from "./split-bar";

const DEFAULT_UF = "sp";

type UfMapaProps = {
  nomeA: string;
  nomeB: string;
  shapes: UfShape[];
  mapaWidth: number;
  mapaHeight: number;
  ufs: ResultadoUf[];
};

function describeUf(uf: ResultadoUf, nomeA: string, nomeB: string): string {
  const vencedor = uf.shareA >= 0.5 ? nomeA : nomeB;
  const vencedorShare = Math.max(uf.shareA, 1 - uf.shareA);
  return `${formatUfNome(uf.siglaUf)}: ${vencedor} venceu com ${formatPercent(vencedorShare)}`;
}

function LeaderMark({ shareA }: { shareA: number }) {
  return (
    <span
      aria-hidden="true"
      className="inline-block size-2.5 shrink-0 rounded-full"
      style={{ backgroundColor: toMapaFillColor(toMapaFill(shareA)) }}
    />
  );
}

function UfDetalhe({
  uf,
  nomeA,
  nomeB,
}: {
  uf: ResultadoUf;
  nomeA: string;
  nomeB: string;
}) {
  return (
    <div
      aria-live="polite"
      className="grid gap-4 rounded-lg border border-border bg-surface p-4"
    >
      <p className="text-lg leading-snug font-[680] text-ink">
        {formatUfNome(uf.siglaUf)}
      </p>
      <div className="grid gap-2">
        <div className="flex justify-between gap-4 text-sm tabular-nums">
          <span className="font-[650] text-series-a">
            {nomeA} {formatPercent(uf.shareA)}
          </span>
          <span className="text-right font-[650] text-series-b">
            {formatPercent(1 - uf.shareA)} {nomeB}
          </span>
        </div>
        <SplitBar
          label={`Resultado em ${formatUfNome(uf.siglaUf)}: ${nomeA} ${formatPercent(uf.shareA)}, ${nomeB} ${formatPercent(1 - uf.shareA)}`}
          shareA={uf.shareA}
          size="sm"
        />
        <div className="flex justify-between gap-4 text-sm text-muted tabular-nums">
          <span>{formatVotosCompact(uf.votosA)} votos</span>
          <span className="text-right">
            {formatVotosCompact(uf.votosB)} votos
          </span>
        </div>
      </div>
      <p className="text-sm text-muted tabular-nums">
        {formatPercent(uf.urnasApuradas / 100, 2)} das urnas apuradas
      </p>
    </div>
  );
}

export function UfMapa({
  nomeA,
  nomeB,
  shapes,
  mapaWidth,
  mapaHeight,
  ufs,
}: UfMapaProps) {
  const bySigla = new Map(ufs.map((uf) => [uf.siglaUf, uf]));
  const [selectedSigla, setSelectedSigla] = useState(DEFAULT_UF);
  const selected = bySigla.get(selectedSigla);
  const exterior = bySigla.get("zz");

  const orderedShapes = [
    ...shapes.filter((shape) => shape.siglaUf !== selectedSigla),
    ...shapes.filter((shape) => shape.siglaUf === selectedSigla),
  ];

  function handleKeyDown(event: KeyboardEvent, siglaUf: string) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setSelectedSigla(siglaUf);
    }
  }

  return (
    <section aria-labelledby="mapa-ufs" className="grid gap-5">
      <div className="grid gap-1">
        <h2 className="text-lg leading-snug font-[680] text-ink" id="mapa-ufs">
          Quem venceu em cada estado
        </h2>
        <p className="text-sm leading-normal text-muted">
          Toque em um estado para ver os números.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] md:items-start">
        <div className="grid gap-3">
          <svg
            aria-label="Mapa do Brasil por estado"
            className="h-auto w-full"
            role="group"
            viewBox={`0 0 ${mapaWidth} ${mapaHeight}`}
          >
            {orderedShapes.map((shape) => {
              const uf = bySigla.get(shape.siglaUf);
              if (!uf) return null;
              const isSelected = shape.siglaUf === selectedSigla;
              return (
                <path
                  aria-label={describeUf(uf, nomeA, nomeB)}
                  aria-pressed={isSelected}
                  className="cursor-pointer outline-none transition-[fill] duration-300 ease-standard focus-visible:stroke-focus motion-reduce:transition-none"
                  d={shape.d}
                  fill={toMapaFillColor(toMapaFill(uf.shareA))}
                  key={shape.siglaUf}
                  onClick={() => setSelectedSigla(shape.siglaUf)}
                  onFocus={() => setSelectedSigla(shape.siglaUf)}
                  onKeyDown={(event) => handleKeyDown(event, shape.siglaUf)}
                  onMouseEnter={() => setSelectedSigla(shape.siglaUf)}
                  role="button"
                  stroke={
                    isSelected ? "var(--color-ink)" : "var(--color-white)"
                  }
                  strokeLinejoin="round"
                  strokeWidth={isSelected ? 2.5 : 1}
                  tabIndex={0}
                />
              );
            })}
            {shapes
              .filter((shape) => shape.showLabel)
              .map((shape) => {
                const uf = bySigla.get(shape.siglaUf);
                if (!uf) return null;
                return (
                  <text
                    aria-hidden="true"
                    className="pointer-events-none text-[17px] font-[700]"
                    dominantBaseline="central"
                    fill={
                      toMapaFill(uf.shareA).isDark
                        ? "var(--color-white)"
                        : "var(--color-ink)"
                    }
                    key={shape.siglaUf}
                    textAnchor="middle"
                    x={shape.labelX}
                    y={shape.labelY}
                  >
                    {formatUfLabel(shape.siglaUf)}
                  </text>
                );
              })}
          </svg>

          <div className="flex flex-wrap items-center justify-between gap-3">
            {exterior ? (
              <button
                aria-label={describeUf(exterior, nomeA, nomeB)}
                aria-pressed={selectedSigla === "zz"}
                className={joinClassNames(
                  "inline-flex min-h-9 items-center gap-2 rounded-md border px-3 text-sm font-[650] text-ink transition-colors duration-[180ms] ease-standard hover:bg-surface-muted",
                  selectedSigla === "zz" ? "border-ink" : "border-border",
                )}
                onClick={() => setSelectedSigla("zz")}
                onMouseEnter={() => setSelectedSigla("zz")}
                type="button"
              >
                <LeaderMark shareA={exterior.shareA} />
                Exterior
              </button>
            ) : null}
            <div className="grid min-w-48 flex-1 gap-1 text-xs text-muted sm:max-w-64">
              <div
                aria-hidden="true"
                className="h-2.5 rounded-full"
                style={{
                  background:
                    "linear-gradient(to right, var(--color-series-b), color-mix(in oklch, var(--color-series-b) 12%, var(--color-white)) 50%, color-mix(in oklch, var(--color-series-a) 12%, var(--color-white)) 50%, var(--color-series-a))",
                }}
              />
              <div className="flex justify-between gap-2">
                <span>{nomeB} +30</span>
                <span>empate</span>
                <span>{nomeA} +30</span>
              </div>
            </div>
          </div>
        </div>

        {selected ? (
          <UfDetalhe nomeA={nomeA} nomeB={nomeB} uf={selected} />
        ) : null}
      </div>
    </section>
  );
}
