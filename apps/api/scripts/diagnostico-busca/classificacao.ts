import type { ProposicoesSearchPlan } from '@/proposicoes/rules/proposicoes-search';

export const CATEGORIAS = [
  'INEXISTENTE',
  'NAO_COMPUTAVEL',
  'CONSULTA_SEM_PLANO',
  'PLANO_CITACAO',
  'RANKING',
  'FORA_DO_CORPUS',
  'MORFOLOGICA',
  'VOCABULARIO',
] as const;

export type Categoria = (typeof CATEGORIAS)[number];

export const CATEGORIA_DESCRICAO: Readonly<Record<Categoria, string>> = {
  INEXISTENTE:
    'O external_id_proposicao nao existe na tabela proposicao. A busca nunca poderia alcanca-lo: o fixture aponta para um id errado ou a proposicao nao foi ingerida.',
  NAO_COMPUTAVEL:
    'A proposicao existe mas nao tem linha em proposicao_computavel. O INNER JOIN do feed a exclui antes de qualquer filtro de texto, entao nenhum ajuste de busca a traria.',
  CONSULTA_SEM_PLANO:
    'toSearchPlan devolveu null (consulta so com separadores). O service converte isso em busca undefined, ou seja, feed sem filtro nenhum.',
  PLANO_CITACAO:
    'parseCitation transformou a consulta em lookup exato por numero (+ sigla, + ano) e o corpus textual foi ignorado por completo. Qualquer esperado que nao seja aquela citacao exata e inalcancavel.',
  RANKING:
    'O documento passa pelo WHERE da busca, mas ficou fora dos 50 primeiros. A ordenacao e por volume_votacoes_plenario (ou data_apresentacao), nunca por relevancia ao termo consultado.',
  FORA_DO_CORPUS:
    'O termo aparece em campo textual da proposicao que a busca nao varre (ementa_detalhada, descricao_tipo, ou resumo de IA ainda nao publicado).',
  MORFOLOGICA:
    'O termo nao casa como substring, mas o corpus tem palavra do mesmo radical sob o stemmer portugues. O LIKE %termo% e substring puro: "impostos" nao encontra "imposto".',
  VOCABULARIO:
    'Residual: nenhum termo que falhou compartilha radical com o corpus. A consulta usa sinonimo, coloquialismo ou vocabulario que o texto simplesmente nao tem.',
};

export type TokenFalho = {
  readonly token: string;
  readonly foraDoCorpus: boolean;
  readonly radicalNoCorpus: boolean;
};

export type EsperadoProbe = {
  readonly plano: ProposicoesSearchPlan | null;
  readonly existe: boolean;
  readonly computavel: boolean;
  readonly satisfazCondicao: boolean;
  readonly tokensFalhos: readonly TokenFalho[];
};

export function classifyAusencia(probe: EsperadoProbe): Categoria {
  if (!probe.existe) {
    return 'INEXISTENTE';
  }

  if (!probe.computavel) {
    return 'NAO_COMPUTAVEL';
  }

  if (probe.plano === null) {
    return 'CONSULTA_SEM_PLANO';
  }

  if (probe.satisfazCondicao) {
    return 'RANKING';
  }

  if (probe.plano.kind === 'citation') {
    return 'PLANO_CITACAO';
  }

  if (probe.tokensFalhos.some((token) => token.foraDoCorpus)) {
    return 'FORA_DO_CORPUS';
  }

  if (probe.tokensFalhos.some((token) => token.radicalNoCorpus)) {
    return 'MORFOLOGICA';
  }

  return 'VOCABULARIO';
}
