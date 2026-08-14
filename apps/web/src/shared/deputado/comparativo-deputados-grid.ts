import type {
  ComparativoCota,
  ComparativoDeputado,
  ComparativoDeputadosResponse,
  DeputadoOrgaosResponse,
  DeputadoProposicoesAssinadasResponse,
  DeputadoResumoPresenca,
} from "@vota-comigo/shared-types";

import {
  formatPercentual,
  nomePublicoLabel,
  toPresencaAmostrasLabel,
} from "./presentation";

export const RECORTE_PRESENCA_COMPARATIVO =
  "Considera toda a base de votações do deputado, não apenas o ano selecionado.";

const ORGAOS_VISIVEIS = 2;

export type ComparativoDeputadosColumn = {
  externalIdDeputado: number;
  nome: string;
  perfilHref: string;
  siglaPartido: string;
  siglaUf: string;
  urlFoto: string | null;
  emAtividade: boolean;
};

export type ComparativoDeputadosCell = {
  externalIdDeputado: number;
  value: string;
  detail: string | null;
  lacuna: boolean;
};

export type ComparativoDeputadosRow = {
  id: string;
  label: string;
  hint: string | null;
  cells: readonly ComparativoDeputadosCell[];
};

export type ComparativoDeputadosGrid = {
  columns: readonly ComparativoDeputadosColumn[];
  rows: readonly ComparativoDeputadosRow[];
};

export function buildComparativoDeputadosGrid(
  response: ComparativoDeputadosResponse,
): ComparativoDeputadosGrid {
  const anoLabel = response.year === null ? "" : ` em ${response.year}`;

  return {
    columns: response.items.map(toColumn),
    rows: [
      {
        id: "presenca",
        label: "Presença registrada",
        hint: RECORTE_PRESENCA_COMPARATIVO,
        cells: response.items.map((item) =>
          toCell(item, toPresencaCell(item.resumoPresenca)),
        ),
      },
      {
        id: "proposicoes-assinadas",
        label: `Proposições assinadas${anoLabel}`,
        hint: null,
        cells: response.items.map((item) =>
          toCell(item, toProposicoesCell(item.proposicoesAssinadas)),
        ),
      },
      {
        id: "orgaos",
        label: `Comissões e outros órgãos${anoLabel}`,
        hint: null,
        cells: response.items.map((item) =>
          toCell(item, toOrgaosCell(item.orgaos)),
        ),
      },
      {
        id: "cota",
        label: `Cota parlamentar${anoLabel}`,
        hint: "Posição frente à mediana do estado, porque o teto da cota varia por estado.",
        cells: response.items.map((item) =>
          toCell(item, toCotaCell(item.cota)),
        ),
      },
    ],
  };
}

function toColumn(item: ComparativoDeputado): ComparativoDeputadosColumn {
  return {
    externalIdDeputado: item.externalIdDeputado,
    nome: nomePublicoLabel(item),
    perfilHref: `/deputados/${item.externalIdDeputado}`,
    siglaPartido: item.snapshotPublico?.siglaPartido ?? "—",
    siglaUf: item.snapshotPublico?.siglaUf ?? "—",
    urlFoto: item.snapshotPublico?.urlFoto ?? null,
    emAtividade: item.emAtividade,
  };
}

type CellContent = Omit<ComparativoDeputadosCell, "externalIdDeputado">;

function toCell(
  item: ComparativoDeputado,
  content: CellContent,
): ComparativoDeputadosCell {
  return { externalIdDeputado: item.externalIdDeputado, ...content };
}

function toPresencaCell(
  resumoPresenca: DeputadoResumoPresenca | null,
): CellContent {
  if (resumoPresenca === null) {
    return { value: "Sem dados de presença", detail: null, lacuna: true };
  }

  return {
    value: formatPercentual(resumoPresenca.percentualPresenca),
    detail: toPresencaAmostrasLabel(
      resumoPresenca.presencas,
      resumoPresenca.totalVotacoesEmExercicio,
    ),
    lacuna: false,
  };
}

function toProposicoesCell(
  proposicoesAssinadas: DeputadoProposicoesAssinadasResponse | null,
): CellContent {
  if (proposicoesAssinadas === null) {
    return { value: "Sem ano comparável", detail: null, lacuna: true };
  }

  if (!proposicoesAssinadas.disponivel) {
    return { value: "Ano não carregado", detail: null, lacuna: true };
  }

  return {
    value: String(proposicoesAssinadas.total),
    detail: `${proposicoesAssinadas.totalPrimeiroSignatario} como primeiro signatário`,
    lacuna: false,
  };
}

function toOrgaosCell(orgaos: DeputadoOrgaosResponse | null): CellContent {
  if (orgaos === null) {
    return { value: "Sem ano comparável", detail: null, lacuna: true };
  }

  if (orgaos.total === 0) {
    return { value: "0", detail: "Nenhum vínculo no ano", lacuna: false };
  }

  const nomes = [
    ...new Set(orgaos.items.map((item) => item.siglaOrgao ?? item.nome)),
  ];
  const visiveis = nomes.slice(0, ORGAOS_VISIVEIS);
  const restantes = nomes.length - visiveis.length;

  return {
    value: String(orgaos.total),
    detail:
      restantes > 0
        ? `${visiveis.join(", ")} e mais ${restantes}`
        : visiveis.join(", "),
    lacuna: false,
  };
}

function toCotaCell(cota: ComparativoCota | null): CellContent {
  if (cota === null) {
    return { value: "Sem ano comparável", detail: null, lacuna: true };
  }

  if (cota.status === "ano-nao-carregado") {
    return { value: "Ano não carregado", detail: null, lacuna: true };
  }

  if (cota.status === "sem-comparacao") {
    return {
      value: toCotaSemComparacaoLabel(cota.motivo),
      detail: null,
      lacuna: true,
    };
  }

  return {
    value: toCotaPosicaoLabel(cota.percentualSobreMedianaUf),
    detail: `Comparação com ${cota.medianaUf.deputadoCount} ${
      cota.medianaUf.deputadoCount === 1 ? "deputado" : "deputados"
    } de ${cota.medianaUf.siglaUf} em exercício durante todo o ano`,
    lacuna: false,
  };
}

function toCotaSemComparacaoLabel(
  motivo: Extract<ComparativoCota, { status: "sem-comparacao" }>["motivo"],
): string {
  if (motivo === "exercicio-parcial") return "Exercício parcial no ano";
  if (motivo === "sem-gastos") return "Sem gastos no ano";
  return "Dado do ano incompleto";
}

function toCotaPosicaoLabel(percentualSobreMedianaUf: number): string {
  const diferenca = Math.round(percentualSobreMedianaUf) - 100;

  if (diferenca === 0) return "Mesmo valor da mediana";

  return `${Math.abs(diferenca)}% ${diferenca < 0 ? "abaixo" : "acima"} da mediana`;
}
