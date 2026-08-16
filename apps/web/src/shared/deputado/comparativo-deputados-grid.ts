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
  COTA_PARLAMENTAR_HELP,
  formatGastoCotaCompacto,
  formatGastoCotaCompactoDistinto,
} from "./gasto-cota-presentation";
import {
  formatPercentual,
  mostrarCoberturaJanela,
  nomePublicoLabel,
  toCoberturaAteLabel,
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

export type ComparativoDeputadosCellLink = {
  href: string;
  label: string;
};

// A barra compara o gasto com as duas réguas na própria célula: o trilho é o
// teto, a marca é a mediana. Formatar continua com a grade; pintar é da view.
export type ComparativoDeputadosCellBarra = {
  gastoCents: number;
  medianaCents: number;
  tetoCents: number | null;
};

// Cada régua da comparação vira uma linha rotulada com o número alinhado à
// direita, para varrer de coluna em coluna. `descricao` é a frase inteira que
// o leitor de tela recebe no lugar do par abreviado.
export type ComparativoDeputadosCellLeitura = {
  id: string;
  label: string;
  value: string;
  descricao: string;
  marcada: boolean;
};

export type ComparativoDeputadosCell = {
  externalIdDeputado: number;
  value: string;
  valueUnit: string | null;
  detail: string | null;
  leituras: readonly ComparativoDeputadosCellLeitura[] | null;
  note: string | null;
  barra: ComparativoDeputadosCellBarra | null;
  link: ComparativoDeputadosCellLink | null;
  lacuna: boolean;
};

export type ComparativoDeputadosRow = {
  id: string;
  label: string;
  hint: string | null;
  help: string | null;
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
        hint: null,
        help: RECORTE_PRESENCA_COMPARATIVO,
        cells: response.items.map((item) =>
          toRowCell(item, () => toPresencaCell(item.resumoPresenca)),
        ),
      },
      {
        id: "proposicoes-assinadas",
        label: "Proposições assinadas",
        hint: null,
        help: null,
        cells: response.items.map((item) =>
          toRowCell(item, () =>
            toProposicoesCell(item.proposicoesAssinadas, item.janela),
          ),
        ),
      },
      {
        id: "orgaos",
        label: "Órgãos distintos",
        hint: null,
        help: null,
        cells: response.items.map((item) =>
          toRowCell(item, () => toOrgaosCell(item.orgaos, item.janela)),
        ),
      },
      {
        id: "cota",
        label: "Gasto da cota parlamentar",
        hint: null,
        help: COTA_PARLAMENTAR_HELP,
        cells: response.items.map((item) =>
          toRowCell(item, () => toCotaCell(item.cota, item.externalIdDeputado)),
        ),
      },
    ],
  };
}

// A cobertura é a mesma para todos os deputados, então vira nota de rodapé da
// comparação em vez de repetir sob cada coluna.
export function toComparativoNotaCobertura(
  response: ComparativoDeputadosResponse,
): string | null {
  const coberturas = response.items
    .flatMap((item) =>
      item.janela.status === "disponivel" ? [item.janela] : [],
    )
    .filter(mostrarCoberturaJanela)
    .map((janela) => janela.coberturaAte)
    .sort();

  const ultima = coberturas.at(-1);
  return ultima === undefined ? null : toCoberturaAteLabel(ultima);
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

type CellContent = Omit<
  ComparativoDeputadosCell,
  "externalIdDeputado" | "link" | "note" | "barra" | "leituras" | "valueUnit"
> & {
  link?: ComparativoDeputadosCellLink;
  note?: string;
  barra?: ComparativoDeputadosCellBarra;
  leituras?: readonly ComparativoDeputadosCellLeitura[];
  valueUnit?: string;
};

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
  return {
    externalIdDeputado: item.externalIdDeputado,
    ...content,
    valueUnit: content.valueUnit ?? null,
    leituras: content.leituras ?? null,
    note: content.note ?? null,
    barra: content.barra ?? null,
    link: content.link ?? null,
  };
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

// A manchete é a média por ano da janela; o total absoluto abre o detalhe,
// para que a contagem continue conferível contra o portal da Câmara.
function toMediaAnual(
  total: number,
  divisorAnosEfetivos: number,
): { value: string; valueUnit?: string } {
  if (divisorAnosEfetivos <= 0) return { value: String(total) };

  const media = total / divisorAnosEfetivos;
  const formatado =
    media < 10
      ? media.toLocaleString("pt-BR", {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        })
      : String(Math.round(media));

  return { value: formatado, valueUnit: "/ano" };
}

function toProposicoesCell(
  proposicoesAssinadas: ComparativoProposicoesAssinadas | null,
  janela: ComparativoJanela,
): CellContent {
  if (proposicoesAssinadas === null || janela.status === "indisponivel") {
    return { value: "Sem dados comparáveis", detail: null, lacuna: true };
  }

  if (!proposicoesAssinadas.disponivel) {
    return {
      value: "Sem dados na janela",
      detail: `Anos não carregados: ${toEnumeracao(
        proposicoesAssinadas.anosDescobertos.map(String),
      )}`,
      lacuna: true,
    };
  }

  return {
    ...toMediaAnual(proposicoesAssinadas.total, janela.divisorAnosEfetivos),
    detail: `${proposicoesAssinadas.total} no total · ${proposicoesAssinadas.totalPrimeiroSignatario} como autor principal`,
    lacuna: false,
  };
}

function toOrgaosCell(
  orgaos: ComparativoOrgaos | null,
  janela: ComparativoJanela,
): CellContent {
  if (orgaos === null || janela.status === "indisponivel") {
    return { value: "Sem dados comparáveis", detail: null, lacuna: true };
  }

  if (orgaos.total === 0) {
    return { value: "0", detail: "Nenhum órgão na janela", lacuna: false };
  }

  const nomes = [
    ...new Set(orgaos.items.map((item) => item.siglaOrgao ?? item.nome)),
  ];
  const visiveis = nomes.slice(0, ORGAOS_VISIVEIS);
  const restantes = nomes.length - visiveis.length;
  const lista =
    restantes > 0
      ? `${visiveis.join(", ")} e mais ${restantes}`
      : visiveis.join(", ");

  return {
    ...toMediaAnual(orgaos.total, janela.divisorAnosEfetivos),
    detail: `${orgaos.total} no total · ${lista}`,
    lacuna: false,
  };
}

function toCotaCell(
  cota: ComparativoCota | null,
  externalIdDeputado: number,
): CellContent {
  if (cota === null) {
    return { value: "Sem dados comparáveis", detail: null, lacuna: true };
  }

  const link = toCotaPerfilLink(cota, externalIdDeputado);

  if (cota.status === "sem-comparacao") {
    return {
      value: toCotaSemComparacaoLabel(cota.motivo),
      detail: null,
      ...(link !== null ? { link } : {}),
      lacuna: true,
    };
  }

  const teto = cota.tetoNaComparacaoCents;
  const escopo =
    cota.anosNaComparacao === 1 ? "Teto do ano" : "Teto do período";

  return {
    value: formatGastoCotaCompacto(
      cota.gastoNaComparacaoCents / cota.anosNaComparacao,
    ),
    valueUnit: "/ano",
    detail: null,
    leituras: [
      ...(teto === null
        ? []
        : [toCotaTetoLeitura(cota.gastoNaComparacaoCents, teto, escopo)]),
      toCotaMedianaLeitura(cota.percentualSobreMedianaUf, cota.siglaUf),
    ],
    note: toCotaTotalLabel(
      cota.gastoNaComparacaoCents,
      teto,
      cota.anosNaComparacao,
    ),
    barra: {
      gastoCents: cota.gastoNaComparacaoCents,
      medianaCents: cota.medianaNaComparacaoCents,
      tetoCents: teto,
    },
    ...(link !== null ? { link } : {}),
    lacuna: false,
  };
}

// Passar de 100% é legítimo: a tabela por UF não inclui os adicionais por
// cargo, e a ressalva vive no HelpPopover da linha.
function toCotaTetoLeitura(
  gastoNaComparacaoCents: number,
  tetoNaComparacaoCents: number,
  escopo: string,
): ComparativoDeputadosCellLeitura {
  const alvo = escopo.toLowerCase();

  if (gastoNaComparacaoCents <= 0) {
    return {
      id: "teto",
      label: escopo,
      value: "0%",
      descricao: `Nenhum valor consumido do ${alvo}`,
      marcada: false,
    };
  }

  const percentual = Math.round(
    (gastoNaComparacaoCents / tetoNaComparacaoCents) * 100,
  );

  return {
    id: "teto",
    label: escopo,
    value: `${percentual}%`,
    descricao: `${percentual}% do ${alvo}`,
    marcada: false,
  };
}

// O sinal sozinho basta na coluna alinhada; a frase inteira segue no
// `descricao` para quem lê por leitor de tela.
function toCotaMedianaLeitura(
  percentualSobreMedianaUf: number,
  siglaUf: string,
): ComparativoDeputadosCellLeitura {
  const label = `Mediana em ${siglaUf}`;
  const diferenca = Math.round(percentualSobreMedianaUf) - 100;

  if (diferenca === 0) {
    return {
      id: "mediana",
      label,
      value: "Igual",
      descricao: `Mesmo valor da mediana em ${siglaUf}`,
      marcada: true,
    };
  }

  const modulo = Math.abs(diferenca);

  return {
    id: "mediana",
    label,
    value: `${diferenca < 0 ? "−" : "+"}${modulo}%`,
    descricao: `${modulo}% ${diferenca < 0 ? "abaixo" : "acima"} da mediana em ${siglaUf}`,
    marcada: true,
  };
}

// O absoluto ancora o teto em reais e mantém o total conferível contra o
// portal da Câmara, que publica ano a ano.
function toCotaTotalLabel(
  gastoNaComparacaoCents: number,
  tetoNaComparacaoCents: number | null,
  anosNaComparacao: number,
): string {
  const janela = `em ${anosNaComparacao} ${anosNaComparacao === 1 ? "ano" : "anos"}`;

  if (tetoNaComparacaoCents === null) {
    return `${formatGastoCotaCompacto(gastoNaComparacaoCents)} no total ${janela}`;
  }

  const [gasto, teto] = formatGastoCotaCompactoDistinto([
    gastoNaComparacaoCents,
    tetoNaComparacaoCents,
  ]);

  return `${gasto} de ${teto} ${janela}`;
}

// O ano a ano vive no perfil, que mostra valores, categorias e as notas da
// fonte; o comparativo aponta para o último ano da janela.
function toCotaPerfilLink(
  cota: ComparativoCota,
  externalIdDeputado: number,
): ComparativoDeputadosCellLink | null {
  const ultimoAno = cota.anos.at(-1);
  if (ultimoAno === undefined) return null;

  return {
    href: `/deputados/${externalIdDeputado}?year=${ultimoAno.year}#gastos`,
    label: "Ver mais detalhes no perfil",
  };
}

function toCotaSemComparacaoLabel(
  motivo: Extract<ComparativoCota, { status: "sem-comparacao" }>["motivo"],
): string {
  if (motivo === "sem-gastos") return "Sem gastos na janela";
  return "Sem mediana na janela";
}
