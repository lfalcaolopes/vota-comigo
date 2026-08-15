import type { DeputadoCeapSigepaDataStatus } from '@vota-comigo/shared-types';

import { CATEGORIA_PASSAGEM_AEREA_SIGEPA } from './categorias-passagem-aerea';

// { mês: { categoria: centavos } } como o dump anual grava, e { mês: centavos }
// como a reposição grava, já que ela só carrega uma categoria.
export type GastosCotaJson = Record<string, Record<string, number>>;
export type GastosSigepaJson = Record<string, number>;

export type MesDaJanela = {
  readonly year: number;
  readonly month: number;
};

// A categoria 998 só passa a aparecer nos dumps a partir de 2019; antes disso
// não há lacuna a repor.
const ANO_INICIAL_CATEGORIA_SIGEPA = 2019;

// A janela da reposição: o dump deixou de publicar a categoria 998 de agosto de
// 2025 em diante. Esvaziá-la aqui — `fim` antes de `inicio`, ou a janela toda em
// null — é o que desliga o mecanismo no dia em que o export for corrigido, sem
// tocar em nenhum ponto de leitura (ADR 022).
const janelaReposicaoSigepa: {
  readonly inicio: MesDaJanela;
  readonly fim: MesDaJanela | null;
} | null = {
  inicio: { year: 2025, month: 8 },
  fim: null,
};

export type ApplyReposicaoSigepaInput = {
  readonly year: number;
  readonly anoReposto: boolean;
  readonly gastosJson: GastosCotaJson | null;
  readonly gastosSigepaJson: GastosSigepaJson | null;
};

// Dentro da janela a categoria 998 vem da reposição e as linhas do dump são
// descartadas. É substituição, não soma: o dump ainda publica estornos negativos
// de 998 na janela, e somar as duas fontes contaria o estorno duas vezes.
export function applyReposicaoSigepa(
  input: ApplyReposicaoSigepaInput,
): GastosCotaJson | null {
  if (!input.anoReposto) {
    return input.gastosJson;
  }

  const repostoByMonth = new Map(
    Object.entries(input.gastosSigepaJson ?? {}).filter(([month]) =>
      isNaJanela(input.year, Number(month)),
    ),
  );
  const months = new Set([
    ...Object.keys(input.gastosJson ?? {}),
    ...repostoByMonth.keys(),
  ]);

  const merged = Object.fromEntries(
    [...months]
      .sort((a, b) => Number(a) - Number(b))
      .map((month): [string, Record<string, number>] => [
        month,
        mergeMes({
          year: input.year,
          month,
          categorias: input.gastosJson?.[month] ?? {},
          reposto: repostoByMonth.get(month),
        }),
      ])
      .filter(([, categorias]) => Object.keys(categorias).length > 0),
  );

  return input.gastosJson === null && Object.keys(merged).length === 0
    ? null
    : merged;
}

export type DeriveSigepaDataStatusInput = {
  readonly year: number;
  readonly coveredThroughMonth: number;
  readonly anoReposto: boolean;
};

export function deriveSigepaDataStatus(
  input: DeriveSigepaDataStatusInput,
): DeputadoCeapSigepaDataStatus {
  if (input.year < ANO_INICIAL_CATEGORIA_SIGEPA) {
    return 'nao-aplicavel';
  }
  if (!alcancaJanela(input.year, input.coveredThroughMonth)) {
    return 'completo';
  }

  return input.anoReposto ? 'completo' : 'incompleto';
}

function mergeMes(input: {
  year: number;
  month: string;
  categorias: Record<string, number>;
  reposto: number | undefined;
}): Record<string, number> {
  if (!isNaJanela(input.year, Number(input.month))) {
    return { ...input.categorias };
  }

  const semSigepa = Object.fromEntries(
    Object.entries(input.categorias).filter(
      ([externalNumSubCota]) =>
        Number(externalNumSubCota) !== CATEGORIA_PASSAGEM_AEREA_SIGEPA,
    ),
  );

  return input.reposto === undefined
    ? semSigepa
    : {
        ...semSigepa,
        [String(CATEGORIA_PASSAGEM_AEREA_SIGEPA)]: input.reposto,
      };
}

function isNaJanela(year: number, month: number): boolean {
  if (janelaReposicaoSigepa === null) {
    return false;
  }

  const mes = toOrdinal({ year, month });
  return (
    mes >= toOrdinal(janelaReposicaoSigepa.inicio) &&
    (janelaReposicaoSigepa.fim === null ||
      mes <= toOrdinal(janelaReposicaoSigepa.fim))
  );
}

// Um ano só é afetado pela regra quando algum mês já carregado cai na janela:
// 2025 carregado até julho fica de fora, e volta a entrar quando o dump avançar.
function alcancaJanela(year: number, coveredThroughMonth: number): boolean {
  if (janelaReposicaoSigepa === null || coveredThroughMonth < 1) {
    return false;
  }

  return (
    toOrdinal({ year, month: coveredThroughMonth }) >=
      toOrdinal(janelaReposicaoSigepa.inicio) &&
    (janelaReposicaoSigepa.fim === null ||
      toOrdinal({ year, month: 1 }) <= toOrdinal(janelaReposicaoSigepa.fim))
  );
}

function toOrdinal(mes: MesDaJanela): number {
  return mes.year * 12 + mes.month - 1;
}
