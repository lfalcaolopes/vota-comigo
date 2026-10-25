"use client";

import type { KeyboardEvent } from "react";
import { useState } from "react";

import { joinClassNames } from "@/shared/ui/utils";

import {
  describeEstimativaSemApuracao,
  formatPercent,
  formatUfLabel,
  formatUfNome,
  formatVotosCompact,
  isSemApuracao,
  rankByRemainingVotos,
  toMapaFill,
  toMapaFillColor,
} from "../lib/apuracao-presentation";
import type { UfShape } from "../lib/mapa-ufs";
import type { ProjecaoUf } from "../lib/projecao-apuracao";
import { SplitBar } from "./split-bar";

const REMAINING_LIST_SIZE = 6;
const HATCH_PATTERN_ID = "uf-sem-apuracao";
const HATCH_CSS =
  "repeating-linear-gradient(45deg, color-mix(in oklch, var(--color-ink) 35%, transparent) 0 1.5px, transparent 1.5px 5px)";

type UfMapaProps = {
  nomeA: string;
  nomeB: string;
  shapes: UfShape[];
  mapaWidth: number;
  mapaHeight: number;
  ufs: ProjecaoUf[];
  urnasApuradasByUf: Record<string, number>;
  variacaoEntreTurnos: number;
};

function describeUf(
  uf: ProjecaoUf,
  nomeA: string,
  nomeB: string,
  apuradas: number,
): string {
  const lider = uf.shareA >= 0.5 ? nomeA : nomeB;
  const liderShare = Math.max(uf.shareA, 1 - uf.shareA);
  return `${formatUfNome(uf.siglaUf)}: ${lider} à frente com ${formatPercent(liderShare)} na projeção; ${formatPercent(apuradas / 100)} das urnas apuradas`;
}

function ProgressBar({ value, label }: { value: number; label: string }) {
  return (
    <div
      aria-label={label}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={value}
      className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted"
      role="progressbar"
    >
      <div
        className="h-full rounded-full bg-ink transition-[width] duration-500 ease-standard motion-reduce:transition-none"
        style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
      />
    </div>
  );
}

function LeaderMark({ shareA, hatched }: { shareA: number; hatched: boolean }) {
  return (
    <span
      aria-hidden="true"
      className="inline-block size-2.5 shrink-0 rounded-full"
      style={{
        backgroundColor: toMapaFillColor(toMapaFill(shareA)),
        backgroundImage: hatched ? HATCH_CSS : undefined,
      }}
    />
  );
}

function HatchSwatch() {
  return (
    <span
      aria-hidden="true"
      className="inline-block size-3.5 shrink-0 rounded-sm border border-border bg-white"
      style={{ backgroundImage: HATCH_CSS }}
    />
  );
}

function UfDetalhe({
  uf,
  nomeA,
  nomeB,
  apuradas,
  variacaoEntreTurnos,
}: {
  uf: ProjecaoUf;
  nomeA: string;
  nomeB: string;
  apuradas: number;
  variacaoEntreTurnos: number;
}) {
  const remaining = Math.max(uf.expectedVotos - uf.countedVotos, 0);
  const semApuracao = isSemApuracao(uf);

  return (
    <div
      aria-live="polite"
      className="grid gap-4 rounded-lg border border-border bg-surface p-4"
    >
      <p className="text-lg leading-snug font-[680] text-ink">
        {formatUfNome(uf.siglaUf)}
      </p>
      {semApuracao ? (
        <p className="flex gap-2.5 rounded-md bg-surface-muted p-3 text-sm leading-normal text-ink">
          <HatchSwatch />
          <span>
            {describeEstimativaSemApuracao(variacaoEntreTurnos, nomeA, nomeB)}
          </span>
        </p>
      ) : null}
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
          label={`Projeção em ${formatUfNome(uf.siglaUf)}: ${nomeA} ${formatPercent(uf.shareA)}, ${nomeB} ${formatPercent(1 - uf.shareA)}`}
          shareA={uf.shareA}
          size="sm"
        />
      </div>
      <div className="grid gap-2">
        <div className="flex justify-between gap-4 text-sm text-muted tabular-nums">
          <span>{formatPercent(apuradas / 100)} apurado</span>
          <span className="text-right">
            faltam {formatVotosCompact(remaining)} votos
          </span>
        </div>
        <ProgressBar
          label={`${formatPercent(apuradas / 100)} das urnas apuradas em ${formatUfNome(uf.siglaUf)}`}
          value={apuradas}
        />
      </div>
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
  urnasApuradasByUf,
  variacaoEntreTurnos,
}: UfMapaProps) {
  const bySigla = new Map(ufs.map((uf) => [uf.siglaUf, uf]));
  const remainingRanking = rankByRemainingVotos(ufs, REMAINING_LIST_SIZE);
  const [chosenUf, setChosenUf] = useState<string | null>(null);
  const selectedSigla = chosenUf ?? remainingRanking[0]?.siglaUf ?? "sp";
  const selected = bySigla.get(selectedSigla);
  const exterior = bySigla.get("zz");

  const orderedShapes = [
    ...shapes.filter((shape) => shape.siglaUf !== selectedSigla),
    ...shapes.filter((shape) => shape.siglaUf === selectedSigla),
  ];

  function handleKeyDown(event: KeyboardEvent, siglaUf: string) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setChosenUf(siglaUf);
    }
  }

  return (
    <section aria-labelledby="mapa-ufs" className="grid gap-5">
      <div className="grid gap-1">
        <h2 className="text-lg leading-snug font-[680] text-ink" id="mapa-ufs">
          Quem lidera a projeção em cada estado
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
            <defs>
              {/* Dark and light lines so the hatch reads on pale and saturated fills alike. */}
              <pattern
                height="8"
                id={HATCH_PATTERN_ID}
                patternTransform="rotate(45)"
                patternUnits="userSpaceOnUse"
                width="8"
              >
                <line
                  stroke="var(--color-ink)"
                  strokeOpacity="0.35"
                  strokeWidth="2"
                  x1="1"
                  x2="1"
                  y1="0"
                  y2="8"
                />
                <line
                  stroke="var(--color-white)"
                  strokeOpacity="0.45"
                  strokeWidth="2"
                  x1="5"
                  x2="5"
                  y1="0"
                  y2="8"
                />
              </pattern>
            </defs>
            {orderedShapes.map((shape) => {
              const uf = bySigla.get(shape.siglaUf);
              if (!uf) return null;
              const isSelected = shape.siglaUf === selectedSigla;
              return (
                <path
                  aria-label={describeUf(
                    uf,
                    nomeA,
                    nomeB,
                    urnasApuradasByUf[shape.siglaUf] ?? 0,
                  )}
                  aria-pressed={isSelected}
                  className="cursor-pointer outline-none transition-[fill] duration-300 ease-standard focus-visible:stroke-focus motion-reduce:transition-none"
                  d={shape.d}
                  fill={toMapaFillColor(toMapaFill(uf.shareA))}
                  key={shape.siglaUf}
                  onClick={() => setChosenUf(shape.siglaUf)}
                  onFocus={() => setChosenUf(shape.siglaUf)}
                  onKeyDown={(event) => handleKeyDown(event, shape.siglaUf)}
                  onMouseEnter={() => setChosenUf(shape.siglaUf)}
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
              .filter((shape) => {
                const uf = bySigla.get(shape.siglaUf);
                return uf !== undefined && isSemApuracao(uf);
              })
              .map((shape) => (
                <path
                  aria-hidden="true"
                  className="pointer-events-none"
                  d={shape.d}
                  fill={`url(#${HATCH_PATTERN_ID})`}
                  key={`hatch-${shape.siglaUf}`}
                />
              ))}
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
                aria-label={describeUf(
                  exterior,
                  nomeA,
                  nomeB,
                  urnasApuradasByUf.zz ?? 0,
                )}
                aria-pressed={selectedSigla === "zz"}
                className={joinClassNames(
                  "inline-flex min-h-9 items-center gap-2 rounded-md border px-3 text-sm font-[650] text-ink transition-colors duration-[180ms] ease-standard hover:bg-surface-muted",
                  selectedSigla === "zz" ? "border-ink" : "border-border",
                )}
                onClick={() => setChosenUf("zz")}
                onMouseEnter={() => setChosenUf("zz")}
                type="button"
              >
                <LeaderMark
                  hatched={isSemApuracao(exterior)}
                  shareA={exterior.shareA}
                />
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
          {ufs.some(isSemApuracao) ? (
            <p className="flex items-center gap-2 text-xs text-muted">
              <HatchSwatch />
              Sem urnas apuradas: estimativa pelo 1º turno
            </p>
          ) : null}
        </div>

        <div className="grid gap-5">
          {selected ? (
            <UfDetalhe
              apuradas={urnasApuradasByUf[selected.siglaUf] ?? 0}
              nomeA={nomeA}
              nomeB={nomeB}
              uf={selected}
              variacaoEntreTurnos={variacaoEntreTurnos}
            />
          ) : null}

          <div className="grid gap-2">
            <h3 className="text-sm font-[650] text-ink">
              Onde ainda faltam mais votos
            </h3>
            <ul className="grid">
              {remainingRanking.map((uf) => {
                const isSelected = uf.siglaUf === selectedSigla;
                return (
                  <li key={uf.siglaUf}>
                    <button
                      aria-pressed={isSelected}
                      className={joinClassNames(
                        "flex w-full items-center justify-between gap-3 rounded-md px-2 py-2 text-left text-sm transition-colors duration-[180ms] ease-standard hover:bg-surface-muted",
                        isSelected && "bg-surface-muted",
                      )}
                      onClick={() => setChosenUf(uf.siglaUf)}
                      type="button"
                    >
                      <span className="inline-flex min-w-0 items-center gap-2 font-[650] text-ink">
                        <LeaderMark
                          hatched={isSemApuracao(uf)}
                          shareA={uf.shareA}
                        />
                        <span className="truncate">
                          {formatUfNome(uf.siglaUf)}
                        </span>
                      </span>
                      <span className="shrink-0 text-muted tabular-nums">
                        faltam {formatVotosCompact(uf.remainingVotos)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
