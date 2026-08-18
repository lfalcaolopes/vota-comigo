import {
  CATEGORIAS,
  CATEGORIA_DESCRICAO,
  type Categoria,
  type TokenFalho,
} from './classificacao';
import {
  CORPUS_COLUNAS,
  CORPUS_DESCRICAO,
  CONDITION_SOURCE_PATH,
  RESUMO_IA_PUBLICO_DESCRICAO,
} from './corpus';
import { SEMANTIC_CANDIDATE_LIMIT } from '@/proposicoes/repository/proposicoes-search.condition';

export type ResultadoTop = {
  readonly posicao: number;
  readonly externalIdProposicao: number;
  readonly titulo: string;
  readonly ementa: string | null;
};

export type EsperadoResultado = {
  readonly externalIdProposicao: number;
  readonly posicao: number | null;
  readonly categoria: Categoria | null;
  readonly tokensFalhos: readonly TokenFalho[];
};

export type ConsultaResultado = {
  readonly consulta: string;
  readonly nota: string;
  readonly plano: string;
  readonly totalNoFiltro: number;
  readonly retornados: number;
  readonly top: readonly ResultadoTop[];
  readonly esperados: readonly EsperadoResultado[];
};

export type Cabecalho = {
  readonly timestamp: string;
  readonly commit: string;
  readonly commitLimpo: boolean;
  readonly banco: string;
  readonly profundidade: number;
  readonly ordenacao: string;
};

export type ResumoCategoria = {
  readonly categoria: Categoria;
  readonly total: number;
  readonly percentual: number;
};

export type DiagnosticoReport = {
  readonly cabecalho: Cabecalho;
  readonly buscaConfig: {
    readonly implementacao: string;
    readonly fonte: string;
    readonly corpusColunas: readonly string[];
    readonly corpusExpressao: string;
    readonly resumoIaPublico: string;
    readonly indiceFts: string;
    readonly sondaMorfologica: string;
    readonly leituraDasCategorias: string;
  };
  readonly consultas: readonly ConsultaResultado[];
  readonly resumo: {
    readonly totalEsperados: number;
    readonly encontrados: number;
    readonly ausentes: number;
    readonly porCategoria: readonly ResumoCategoria[];
  };
};

export function buildBuscaConfig(): DiagnosticoReport['buscaConfig'] {
  return {
    implementacao: `Citacao (sigla/numero/ano) vira lookup exato e ignora o corpus. Fora dela, a consulta e vetorizada e ranqueada por distancia cosseno sobre proposicao_embedding, com corte nos ${SEMANTIC_CANDIDATE_LIMIT} vizinhos mais proximos ja filtrados por tema e computavel. Sem vetor da consulta (provider indisponivel ou sem credencial) a busca degrada para LIKE %token% com AND, sobre o corpus concatenado e sem acento — que e o corpus descrito abaixo.`,
    fonte: CONDITION_SOURCE_PATH,
    corpusColunas: [...CORPUS_COLUNAS],
    corpusExpressao: CORPUS_DESCRICAO,
    resumoIaPublico: RESUMO_IA_PUBLICO_DESCRICAO,
    indiceFts:
      'Nenhum. Nao existe coluna tsvector nem indice GIN sobre proposicao, portanto nao ha stemmer nem lista de stopwords de producao a reusar.',
    sondaMorfologica:
      "to_tsvector('portuguese', <corpus>) @@ plainto_tsquery('portuguese', <token>) — usado somente como sonda de diagnostico para a categoria MORFOLOGICA, nao reflete o comportamento de producao.",
    leituraDasCategorias:
      'As categorias foram desenhadas para o filtro textual. Sob ranqueamento semantico, a proposicao esperada quase sempre passa no WHERE e cai fora do top por posicao, entao MORFOLOGICA e VOCABULARIO deixam de separar causas e a leitura util e RANKING.',
  };
}

export function buildResumo(
  consultas: readonly ConsultaResultado[],
): DiagnosticoReport['resumo'] {
  const esperados = consultas.flatMap((consulta) => consulta.esperados);
  const ausentes = esperados.filter((esperado) => esperado.posicao === null);

  const porCategoria = CATEGORIAS.map((categoria) => {
    const total = ausentes.filter(
      (esperado) => esperado.categoria === categoria,
    ).length;
    return {
      categoria,
      total,
      percentual: ausentes.length === 0 ? 0 : (total * 100) / ausentes.length,
    };
  }).filter((linha) => linha.total > 0);

  return {
    totalEsperados: esperados.length,
    encontrados: esperados.length - ausentes.length,
    ausentes: ausentes.length,
    porCategoria,
  };
}

export function toMarkdown(report: DiagnosticoReport): string {
  return [
    '# Diagnostico de busca',
    '',
    ...cabecalhoMarkdown(report),
    '',
    '## Consultas',
    '',
    ...report.consultas.flatMap((consulta) => consultaMarkdown(consulta)),
    ...resumoMarkdown(report),
  ].join('\n');
}

function cabecalhoMarkdown(report: DiagnosticoReport): readonly string[] {
  const { cabecalho, buscaConfig } = report;

  return [
    '## Cabecalho',
    '',
    `- **Timestamp**: ${cabecalho.timestamp}`,
    `- **Commit**: ${cabecalho.commit}${cabecalho.commitLimpo ? '' : ' (working tree sujo)'}`,
    `- **Banco alvo**: ${cabecalho.banco}`,
    `- **Profundidade**: ${cabecalho.profundidade} resultados por consulta`,
    `- **Ordenacao**: ${cabecalho.ordenacao}`,
    '',
    '## Configuracao de busca',
    '',
    `- **Implementacao**: ${buscaConfig.implementacao}`,
    `- **Fonte**: ${buscaConfig.fonte}`,
    `- **Indice FTS**: ${buscaConfig.indiceFts}`,
    `- **Sonda morfologica**: ${buscaConfig.sondaMorfologica}`,
    `- **Leitura das categorias**: ${buscaConfig.leituraDasCategorias}`,
    '',
    '### Corpus varrido',
    '',
    'Colunas concatenadas, nesta ordem:',
    '',
    ...buscaConfig.corpusColunas.map((coluna) => `1. \`${coluna}\``),
    '',
    '```sql',
    buscaConfig.corpusExpressao,
    '```',
    '',
    `Gate de resumo publico: \`${buscaConfig.resumoIaPublico}\`.`,
    '',
    'O corpus acima foi verificado contra a producao antes de qualquer classificacao; divergencia aborta o script.',
  ];
}

function consultaMarkdown(consulta: ConsultaResultado): readonly string[] {
  return [
    `### \`${consulta.consulta}\``,
    '',
    `- **Nota**: ${consulta.nota === '' ? '(vazia)' : consulta.nota}`,
    `- **Plano**: ${consulta.plano}`,
    `- **Total no filtro**: ${consulta.totalNoFiltro} (retornados ${consulta.retornados})`,
    '',
    '**Top 5 retornados**',
    '',
    ...topMarkdown(consulta.top),
    '',
    '**Esperados**',
    '',
    '| external_id | posicao | categoria | tokens que falharam |',
    '| --- | --- | --- | --- |',
    ...consulta.esperados.map((esperado) => esperadoRow(esperado)),
    '',
  ];
}

function topMarkdown(top: readonly ResultadoTop[]): readonly string[] {
  if (top.length === 0) {
    return ['_Nenhum resultado retornado._'];
  }

  return [
    '| # | external_id | titulo | ementa |',
    '| --- | --- | --- | --- |',
    ...top.map(
      (item) =>
        `| ${item.posicao} | ${item.externalIdProposicao} | ${item.titulo} | ${truncate(item.ementa)} |`,
    ),
  ];
}

function esperadoRow(esperado: EsperadoResultado): string {
  const posicao = esperado.posicao === null ? 'AUSENTE' : `${esperado.posicao}`;
  const categoria = esperado.categoria ?? '-';
  const tokens =
    esperado.tokensFalhos.length === 0
      ? '-'
      : esperado.tokensFalhos
          .map((token) => `\`${token.token}\`${tokenTag(token)}`)
          .join(', ');

  return `| ${esperado.externalIdProposicao} | ${posicao} | ${categoria} | ${tokens} |`;
}

function tokenTag(token: TokenFalho): string {
  if (token.foraDoCorpus) {
    return ' (fora do corpus)';
  }
  if (token.radicalNoCorpus) {
    return ' (radical no corpus)';
  }
  return '';
}

function resumoMarkdown(report: DiagnosticoReport): readonly string[] {
  const { resumo } = report;
  const cobertura =
    resumo.totalEsperados === 0
      ? 0
      : (resumo.encontrados * 100) / resumo.totalEsperados;

  return [
    '## Resumo',
    '',
    `- **Esperados**: ${resumo.totalEsperados}`,
    `- **Encontrados no top ${report.cabecalho.profundidade}**: ${resumo.encontrados} (${formatPercent(cobertura)})`,
    `- **Ausentes**: ${resumo.ausentes} (${formatPercent(100 - cobertura)})`,
    '',
    '### Ausentes por categoria',
    '',
    ...(resumo.porCategoria.length === 0
      ? ['_Nenhum ausente._']
      : [
          '| categoria | total | % dos ausentes |',
          '| --- | --- | --- |',
          ...resumo.porCategoria.map(
            (linha) =>
              `| ${linha.categoria} | ${linha.total} | ${formatPercent(linha.percentual)} |`,
          ),
        ]),
    '',
    '### O que cada categoria significa',
    '',
    ...resumo.porCategoria.map(
      (linha) =>
        `- **${linha.categoria}**: ${CATEGORIA_DESCRICAO[linha.categoria]}`,
    ),
    '',
  ];
}

function truncate(value: string | null): string {
  if (value === null) {
    return '-';
  }
  const flat = value.replace(/\s+/g, ' ').replace(/\|/g, '\\|').trim();
  return flat.length <= 160 ? flat : `${flat.slice(0, 159)}…`;
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}
