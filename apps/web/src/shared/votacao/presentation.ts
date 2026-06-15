import type {
  PlacarVotacao,
  Resultado,
  VotacaoNominal,
} from "@vota-comigo/shared-types";

export { formatShortDate } from "../proposicao/presentation";

export type ResultadoTone = "neutral" | "success" | "danger";

export type PlacarCategoria = {
  label: string;
  votos: number;
  tone: "success" | "danger";
};

export function toResultadoLabel(resultado: Resultado): string {
  if (resultado === "aprovada") return "Aprovada";
  if (resultado === "rejeitada") return "Rejeitada";
  return "Indisponível";
}

export function toResultadoTone(resultado: Resultado): ResultadoTone {
  if (resultado === "aprovada") return "success";
  if (resultado === "rejeitada") return "danger";
  return "neutral";
}

export function toComparadorLabel(
  votacao: Pick<VotacaoNominal, "isReferenciaMatcher">,
): string | null {
  return votacao.isReferenciaMatcher ? "Votação usada no comparador" : null;
}

export function toPlacarCategorias(placar: PlacarVotacao): PlacarCategoria[] {
  return [
    { label: "Sim", votos: placar.votosSim, tone: "success" },
    { label: "Não", votos: placar.votosNao, tone: "danger" },
  ];
}

export function toPlacarResumidoLabel(placar: PlacarVotacao): string | null {
  return placar.placarCompleto ? null : "Placar resumido";
}

export function sortByDataDesc(votacoes: VotacaoNominal[]): VotacaoNominal[] {
  return [...votacoes].sort((a, b) => {
    if (a.data === null && b.data === null) return 0;
    if (a.data === null) return 1;
    if (b.data === null) return -1;
    return b.data.localeCompare(a.data);
  });
}
