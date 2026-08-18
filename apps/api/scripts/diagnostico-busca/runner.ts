import type { DrizzleDatabase } from '@/shared/database/client';
import type { ProposicoesRepository } from '@/proposicoes/proposicoes.repository';
import type { ProposicoesSearchPlan } from '@/proposicoes/rules/proposicoes-search';
import {
  resolveSearchPlan,
  type QueryEmbedding,
} from '@/proposicoes/service/query-embedding';
import type { ProposicaoFeedItem } from '@/proposicoes/types/proposicoes.types';
import { SEMANTIC_CANDIDATE_LIMIT } from '@/proposicoes/repository/proposicoes-search.condition';

import { classifyAusencia } from './classificacao';
import type { ConsultaFixture } from './consultas-fixture';
import {
  describeTokensFalhos,
  findTokensFalhos,
  loadEsperadoDetalhes,
  satisfazCondicaoDeBusca,
  type EsperadoDetalhe,
} from './probes';
import type {
  ConsultaResultado,
  EsperadoResultado,
  ResultadoTop,
} from './relatorio';

export const PROFUNDIDADE = 50;
export const ORDENACAO = 'mais-votadas' as const;

const TOP_EXIBIDOS = 5;

export async function runConsulta(
  db: DrizzleDatabase,
  repository: ProposicoesRepository,
  fixture: ConsultaFixture,
  queryEmbedding: QueryEmbedding,
): Promise<ConsultaResultado> {
  const plano = await resolveSearchPlan(fixture.consulta, queryEmbedding);

  const page = await repository.loadProposicoesComputaveis({
    ordenacao: ORDENACAO,
    busca: plano ?? undefined,
    pagination: { limit: PROFUNDIDADE, offset: 0 },
  });

  const posicoes = new Map(
    page.items.map((item, index) => [
      item.proposicao.externalIdProposicao,
      index + 1,
    ]),
  );

  const ausentes = fixture.esperados.filter((id) => !posicoes.has(id));
  const detalhes = await loadEsperadoDetalhes(db, ausentes);

  const esperados: EsperadoResultado[] = [];
  for (const externalIdProposicao of fixture.esperados) {
    esperados.push(
      await resolveEsperado(
        db,
        plano,
        externalIdProposicao,
        posicoes.get(externalIdProposicao) ?? null,
        detalhes.get(externalIdProposicao),
      ),
    );
  }

  return {
    consulta: fixture.consulta,
    nota: fixture.nota,
    plano: describePlano(plano),
    totalNoFiltro: page.total,
    retornados: page.items.length,
    top: page.items.slice(0, TOP_EXIBIDOS).map(toResultadoTop),
    esperados,
  };
}

async function resolveEsperado(
  db: DrizzleDatabase,
  plano: ProposicoesSearchPlan | null,
  externalIdProposicao: number,
  posicao: number | null,
  detalhe: EsperadoDetalhe | undefined,
): Promise<EsperadoResultado> {
  if (posicao !== null) {
    return {
      externalIdProposicao,
      posicao,
      categoria: null,
      tokensFalhos: [],
    };
  }

  if (detalhe === undefined) {
    return {
      externalIdProposicao,
      posicao: null,
      categoria: classifyAusencia({
        plano,
        existe: false,
        computavel: false,
        satisfazCondicao: false,
        tokensFalhos: [],
      }),
      tokensFalhos: [],
    };
  }

  const satisfazCondicao =
    plano !== null &&
    detalhe.computavel &&
    (await satisfazCondicaoDeBusca(db, plano, externalIdProposicao));

  const tokensFalhos =
    plano === null || plano.kind !== 'tokens' || satisfazCondicao
      ? []
      : await describeTokensFalhos(
          db,
          findTokensFalhos(plano.tokens, detalhe),
          detalhe,
        );

  return {
    externalIdProposicao,
    posicao: null,
    categoria: classifyAusencia({
      plano,
      existe: true,
      computavel: detalhe.computavel,
      satisfazCondicao,
      tokensFalhos,
    }),
    tokensFalhos,
  };
}

function toResultadoTop(item: ProposicaoFeedItem, index: number): ResultadoTop {
  const { siglaTipo, numero, ano, ementa, externalIdProposicao } =
    item.proposicao;

  return {
    posicao: index + 1,
    externalIdProposicao,
    titulo: `${siglaTipo ?? '?'} ${numero ?? '?'}/${ano ?? '?'}`,
    ementa,
  };
}

function describePlano(plano: ProposicoesSearchPlan | null): string {
  if (plano === null) {
    return 'nenhum — toSearchPlan devolveu null, o feed roda sem filtro de busca';
  }

  if (plano.kind === 'citation') {
    const { siglaTipo, numero, ano } = plano.citation;
    const partes = [
      siglaTipo === undefined ? null : `sigla=${siglaTipo}`,
      `numero=${numero}`,
      ano === undefined ? null : `ano=${ano}`,
    ].filter((parte): parte is string => parte !== null);
    return `citacao (lookup exato, corpus ignorado): ${partes.join(' ')}`;
  }

  if (plano.kind === 'semantic') {
    return `vetorial (distancia cosseno, top ${SEMANTIC_CANDIDATE_LIMIT})`;
  }

  return `tokens (AND, LIKE %token%): [${plano.tokens.join(', ')}]`;
}
