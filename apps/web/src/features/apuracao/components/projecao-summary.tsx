import { describeLideranca, formatPercent } from "../lib/apuracao-presentation";
import { SplitBar } from "./split-bar";

type ProjecaoSummaryProps = {
  nomeA: string;
  nomeB: string;
  projecaoShareA: number;
  oficialShareA: number;
  urnasApuradas: number;
};

export function ProjecaoSummary({
  nomeA,
  nomeB,
  projecaoShareA,
  oficialShareA,
  urnasApuradas,
}: ProjecaoSummaryProps) {
  return (
    <section
      aria-labelledby="projecao-lideranca"
      className="grid gap-5 rounded-lg border border-border bg-surface p-5 md:p-6"
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
          label={`Projeção: ${nomeA} ${formatPercent(projecaoShareA)}, ${nomeB} ${formatPercent(1 - projecaoShareA)}. A linha central marca 50% dos votos válidos.`}
          shareA={projecaoShareA}
          size="lg"
        />
      </div>

      <p className="border-t border-border pt-4 text-sm text-muted tabular-nums">
        Apuração oficial até agora:{" "}
        <span className="font-[650] whitespace-nowrap text-series-a">
          {nomeA} {formatPercent(oficialShareA)}
        </span>
        {" · "}
        <span className="font-[650] whitespace-nowrap text-series-b">
          {nomeB} {formatPercent(1 - oficialShareA)}
        </span>
      </p>
    </section>
  );
}
