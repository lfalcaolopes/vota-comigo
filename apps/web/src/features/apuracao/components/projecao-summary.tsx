import { describeLideranca, formatPercent } from "../lib/apuracao-presentation";
import { SplitBar } from "./split-bar";

type ProjecaoSummaryProps = {
  nomeA: string;
  nomeB: string;
  projecaoShareA: number;
  oficialShareA: number;
  votosA: number;
  votosB: number;
  urnasApuradas: number;
};

export function ProjecaoSummary({
  nomeA,
  nomeB,
  projecaoShareA,
  oficialShareA,
  votosA,
  votosB,
  urnasApuradas,
}: ProjecaoSummaryProps) {
  const urnasLabel = urnasApuradas.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <section
      aria-labelledby="projecao-lideranca"
      className="grid gap-6 rounded-lg border border-border bg-surface p-5 md:p-6"
    >
      <h2
        className="text-2xl leading-tight font-[700] tracking-[-0.01em] text-balance text-ink"
        id="projecao-lideranca"
      >
        {describeLideranca(projecaoShareA, nomeA, nomeB, urnasApuradas)}
      </h2>

      <div className="grid gap-3">
        <div className="flex items-end justify-between gap-4">
          <p className="grid gap-0.5">
            <span className="text-sm font-[650] text-muted">{nomeA}</span>
            <span className="text-3xl leading-none font-[720] tracking-[-0.02em] text-series-a tabular-nums">
              {formatPercent(projecaoShareA)}
            </span>
          </p>
          <p className="grid gap-0.5 text-right">
            <span className="text-sm font-[650] text-muted">{nomeB}</span>
            <span className="text-3xl leading-none font-[720] tracking-[-0.02em] text-series-b tabular-nums">
              {formatPercent(1 - projecaoShareA)}
            </span>
          </p>
        </div>
        <SplitBar
          label={`Projeção: ${nomeA} ${formatPercent(projecaoShareA)}, ${nomeB} ${formatPercent(1 - projecaoShareA)}`}
          shareA={projecaoShareA}
          size="lg"
        />
        <p className="text-center text-xs text-subtle">
          A linha central marca 50% dos votos válidos
        </p>
      </div>

      <div className="grid gap-4 border-t border-border pt-5 md:grid-cols-2 md:gap-8">
        <div className="grid content-start gap-2">
          <p className="text-sm font-[650] text-ink">
            Apuração oficial até agora
          </p>
          <SplitBar
            label={`Apuração oficial: ${nomeA} ${formatPercent(oficialShareA)}, ${nomeB} ${formatPercent(1 - oficialShareA)}`}
            shareA={oficialShareA}
            size="sm"
          />
          <div className="flex justify-between gap-4 text-sm text-muted tabular-nums">
            <span>
              <span className="font-[650] text-series-a">
                {formatPercent(oficialShareA)}
              </span>{" "}
              ({votosA.toLocaleString("pt-BR")} votos)
            </span>
            <span className="text-right">
              <span className="font-[650] text-series-b">
                {formatPercent(1 - oficialShareA)}
              </span>{" "}
              ({votosB.toLocaleString("pt-BR")} votos)
            </span>
          </div>
        </div>

        <div className="grid content-start gap-2">
          <p className="text-sm font-[650] text-ink">
            {urnasLabel}% das urnas apuradas
          </p>
          <div
            aria-label={`${urnasLabel}% das urnas apuradas`}
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={urnasApuradas}
            className="h-2 w-full overflow-hidden rounded-full bg-surface-muted"
            role="progressbar"
          >
            <div
              className="h-full rounded-full bg-ink transition-[width] duration-500 ease-standard motion-reduce:transition-none"
              style={{ width: `${Math.max(urnasApuradas, 0.5)}%` }}
            />
          </div>
          <p className="text-sm text-muted">
            {urnasApuradas < 10
              ? "Com menos de 10% das urnas, a projeção ainda oscila bastante."
              : "A projeção já se apoia em boa parte do país."}
          </p>
        </div>
      </div>
    </section>
  );
}
