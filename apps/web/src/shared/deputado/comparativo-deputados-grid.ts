import type {
  ComparativoCota,
  ComparativoDeputado,
  ComparativoDeputadosResponse,
  ComparativoJanela,
  ComparativoOrgaos,
  ComparativoProposicoesAssinadas,
  DeputadoResumoPresenca,
} from "@vota-comigo/shared-types";

import {
  formatPercentual,
  nomePublicoLabel,
  toPresencaAmostrasLabel,
  toUltimaLegislaturaLabel,
} from "./presentation";

export const RECORTE_PRESENCA_COMPARATIVO =
  "Considera as votações de plenário da legislatura mostrada na coluna.";

const ORGAOS_VISIVEIS = 2;

export type ComparativoDeputadosColumn = {
  externalIdDeputado: number;
  nome: string;
  perfilHref: string;
  siglaPartido: string;
  siglaUf: string;
  urlFoto: string | null;
  emAtividade: boolean;
  janela: ComparativoJanela;
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

export type ComparativoAvisoTone = "neutral" | "warning";

export type ComparativoAviso = {
  tone: ComparativoAvisoTone;
  title: string;
  body: string;
};

export function buildComparativoDeputadosGrid(
  response: ComparativoDeputadosResponse,
): ComparativoDeputadosGrid {
  return {
    columns: response.items.map(toColumn),
    rows: [
      {
        id: "presenca",
        label: "Presença registrada",
        hint: RECORTE_PRESENCA_COMPARATIVO,
        cells: response.items.map((item) =>
          toRowCell(item, () => toPresencaCell(item.resumoPresenca)),
        ),
      },
      {
        id: "proposicoes-assinadas",
        label: "Proposições assinadas",
        hint: null,
        cells: response.items.map((item) =>
          toRowCell(item, () => toProposicoesCell(item.proposicoesAssinadas)),
        ),
      },
      {
        id: "orgaos",
        label: "Comissões e outros órgãos",
        hint: null,
        cells: response.items.map((item) =>
          toRowCell(item, () => toOrgaosCell(item.orgaos)),
        ),
      },
      {
        id: "cota",
        label: "Cota parlamentar",
        hint: "Posição frente à mediana do estado, porque o teto da cota varia por estado.",
        cells: response.items.map((item) =>
          toRowCell(item, () => toCotaCell(item.cota)),
        ),
      },
    ],
  };
}

export function toComparativoAviso(
  response: ComparativoDeputadosResponse,
): ComparativoAviso | null {
  const recusados = response.items.filter(
    (item) => item.janela.status === "indisponivel",
  );

  if (recusados.length > 0) {
    return toRecusaAviso(recusados, response.items.length);
  }

  if (!response.janelasCoincidem) {
    return toDivergenciaAviso(response.items);
  }

  return null;
}

function toRecusaAviso(
  recusados: readonly ComparativoDeputado[],
  totalItems: number,
): ComparativoAviso {
  const remaining = totalItems - recusados.length;
  const title =
    recusados.length === 1
      ? "Um dos deputados está fora da base comparável"
      : recusados.length === 2
        ? "Dois dos deputados estão fora da base comparável"
        : "Todos os deputados estão fora da base comparável";

  const frases = recusados.map((item) => {
    const janela = item.janela;
    const nome = nomePublicoLabel(item);
    return janela.status === "indisponivel" && janela.ultimaLegislatura !== null
      ? `${nome} atuou pela última vez na ${janela.ultimaLegislatura}ª legislatura`
      : `${nome} não tem legislatura registrada`;
  });

  const cobertura =
    "O Vota Comigo cobre votações, cota parlamentar e mediana de gastos a partir de 2015, início da 55ª legislatura, então não há dados desse mandato para comparar.";
  const demais =
    remaining >= 2 ? " Os demais deputados continuam comparáveis." : "";

  return {
    tone: "neutral",
    title,
    body: `${frases.join(". ")}. ${cobertura}${demais}`,
  };
}

function toDivergenciaAviso(
  items: readonly ComparativoDeputado[],
): ComparativoAviso {
  const grupos = new Map<number, string[]>();
  for (const item of items) {
    if (item.janela.status !== "disponivel") continue;
    const nomes = grupos.get(item.janela.legislatura) ?? [];
    nomes.push(nomePublicoLabel(item));
    grupos.set(item.janela.legislatura, nomes);
  }

  const entradas = [...grupos.entries()].map(
    ([legislatura, nomes]) => `${legislatura}ª (${toEnumeracao(nomes)})`,
  );

  return {
    tone: "warning",
    title: "Legislaturas diferentes",
    body: `Cada deputado aparece na última legislatura em que atuou: ${toEnumeracao(entradas)}. Os números de cada coluna são do período dela, não de um período comum.`,
  };
}

function toEnumeracao(items: readonly string[]): string {
  if (items.length <= 1) return items.join("");
  if (items.length === 2) return `${items[0]} e ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} e ${items[items.length - 1]}`;
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
    janela: item.janela,
  };
}

type CellContent = Omit<ComparativoDeputadosCell, "externalIdDeputado">;

function toRowCell(
  item: ComparativoDeputado,
  content: () => CellContent,
): ComparativoDeputadosCell {
  if (item.janela.status === "indisponivel") {
    return toCell(item, toRecusaCell(item.janela));
  }

  return toCell(item, content());
}

function toCell(
  item: ComparativoDeputado,
  content: CellContent,
): ComparativoDeputadosCell {
  return { externalIdDeputado: item.externalIdDeputado, ...content };
}

function toRecusaCell(
  janela: Extract<ComparativoJanela, { status: "indisponivel" }>,
): CellContent {
  return {
    value: "Sem dados comparáveis",
    detail:
      janela.ultimaLegislatura === null
        ? null
        : toUltimaLegislaturaLabel(janela.ultimaLegislatura),
    lacuna: true,
  };
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
  proposicoesAssinadas: ComparativoProposicoesAssinadas | null,
): CellContent {
  if (proposicoesAssinadas === null) {
    return { value: "Sem dados comparáveis", detail: null, lacuna: true };
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

function toOrgaosCell(orgaos: ComparativoOrgaos | null): CellContent {
  if (orgaos === null) {
    return { value: "Sem dados comparáveis", detail: null, lacuna: true };
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
    return { value: "Sem dados comparáveis", detail: null, lacuna: true };
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
