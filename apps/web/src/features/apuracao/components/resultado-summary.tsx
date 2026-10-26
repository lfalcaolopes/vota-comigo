import { describeVencedor, formatPercent } from "../lib/apuracao-presentation";
import type { ResultadoFinal } from "../lib/resultado-apuracao";
import { SplitBar } from "./split-bar";

type ResultadoSummaryProps = {
  nomeA: string;
  nomeB: string;
  resultado: ResultadoFinal;
};

export function ResultadoSummary({
  nomeA,
  nomeB,
  resultado,
}: ResultadoSummaryProps) {
  const [data, hora] = resultado.tseUpdatedAt.split(" ");

  return (
    <section
      aria-labelledby="resultado-vencedor"
      className="grid gap-5 rounded-lg border border-border bg-surface p-5 md:p-6"
    >
      <h2
        className="text-2xl leading-tight font-[700] tracking-[-0.01em] text-balance text-ink"
        id="resultado-vencedor"
      >
        {describeVencedor(resultado.shareA, nomeA, nomeB)}
      </h2>

      <div className="grid gap-3">
        <div className="flex items-end justify-between gap-4">
          <p className="grid gap-0.5">
            <span className="text-sm font-[650] text-muted">{nomeA}</span>
            <span className="text-3xl leading-none font-[720] tracking-[-0.02em] text-series-a tabular-nums">
              {formatPercent(resultado.shareA)}
            </span>
          </p>
          <p className="grid gap-0.5 text-right">
            <span className="text-sm font-[650] text-muted">{nomeB}</span>
            <span className="text-3xl leading-none font-[720] tracking-[-0.02em] text-series-b tabular-nums">
              {formatPercent(1 - resultado.shareA)}
            </span>
          </p>
        </div>
        <SplitBar
          label={`Resultado: ${nomeA} ${formatPercent(resultado.shareA)}, ${nomeB} ${formatPercent(1 - resultado.shareA)}. A linha central marca 50% dos votos válidos.`}
          shareA={resultado.shareA}
          size="lg"
        />
        <div className="flex justify-between gap-4 text-sm text-muted tabular-nums">
          <span>
            {resultado.candidatoA.votos.toLocaleString("pt-BR")} votos
          </span>
          <span className="text-right">
            {resultado.candidatoB.votos.toLocaleString("pt-BR")} votos
          </span>
        </div>
      </div>

      <p className="border-t border-border pt-4 text-sm text-muted tabular-nums">
        {formatPercent(resultado.urnasApuradas / 100, 2)} das urnas apuradas na
        última leitura do TSE, às {hora?.slice(0, 5)} de {data}.
      </p>
    </section>
  );
}
