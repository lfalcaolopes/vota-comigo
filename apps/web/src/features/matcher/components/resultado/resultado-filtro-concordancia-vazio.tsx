import type {
  EscopoMatcher,
  PosicaoUsuarioMatcher,
  ProposicaoCard,
} from "@vota-comigo/shared-types";

import { ProposicoesSelecionadasList } from "@/shared/proposicao";
import { Button, Checkbox } from "@/shared/ui";

type ResultadoFiltroConcordanciaVazioProps = {
  escopo: EscopoMatcher;
  onEscopoChange: (escopo: EscopoMatcher) => void;
  onToggleProposicao: (externalIdProposicao: number) => void;
  posicoes: ReadonlyMap<number, PosicaoUsuarioMatcher>;
  proposicoes: readonly ProposicaoCard[];
};

export function ResultadoFiltroConcordanciaVazio({
  escopo,
  onEscopoChange,
  onToggleProposicao,
  posicoes,
  proposicoes,
}: ResultadoFiltroConcordanciaVazioProps) {
  const proposicoesCountLabel =
    proposicoes.length === 1
      ? "1 proposição marcada"
      : `${proposicoes.length} proposições marcadas`;

  return (
    <section className="grid justify-items-start gap-4 rounded-lg border border-dashed border-border-strong bg-surface p-6">
      <div className="grid gap-2">
        <h2 className="text-lg font-bold">
          Nenhum deputado votou como você em todas
        </h2>
        <p className="leading-normal text-muted">
          O filtro exige concordância {proposicoes.length === 1 ? "na" : "nas"}{" "}
          {proposicoesCountLabel}.
        </p>
      </div>
      <ProposicoesSelecionadasList
        ariaLabel="Proposições que deixaram o resultado vazio"
        className="w-full"
        posicoes={posicoes}
        proposicoes={proposicoes}
        renderAction={(proposicao, _index, identificador) => (
          <Checkbox
            checked
            className="size-11 justify-center"
            hideLabel
            label={`Deixar de exigir concordância em ${identificador}`}
            onChange={() => onToggleProposicao(proposicao.externalIdProposicao)}
          />
        )}
      />
      {escopo === "estadual" ? (
        <Button onClick={() => onEscopoChange("nacional")} variant="primary">
          Ampliar busca para o Brasil
        </Button>
      ) : null}
    </section>
  );
}
