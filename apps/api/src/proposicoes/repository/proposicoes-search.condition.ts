import { and, or, sql, type SQL, type SQLWrapper } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

import {
  proposicao,
  proposicaoComputavel,
  proposicaoEmbedding,
  proposicaoResumoIa,
  proposicaoTema,
} from '@/shared/database/schema';

import type {
  Citation,
  ProposicoesSearchPlan,
} from '../rules/proposicoes-search';

// Espelha normalizeText do planner: os dois lados da comparacao chegam sem
// acento e em minusculas. translate e imutavel e nao depende de extensao.
const COM_ACENTO = 'áàâãäéèêëíìîïóòôõöúùûüçñýÿ';
const SEM_ACENTO = 'aaaaaeeeeiiiiooooouuuucnyy';

// Quantos vizinhos mais proximos entram na pagina. Sem esse corte o total do
// feed passaria a ser o corpus inteiro em toda busca semantica.
export const SEMANTIC_CANDIDATE_LIMIT = 200;

function semAcento(value: SQLWrapper): SQL {
  return sql`translate(lower(coalesce(${value}, '')), ${COM_ACENTO}, ${SEM_ACENTO})`;
}

// Mesmo gate de toResumoIaCardFields: resumo nao publico nao pode ser
// alcancado pela busca, senao vira canal de leitura do que nao foi aprovado.
const RESUMO_IA_PUBLICO = sql`${proposicaoResumoIa.generationStatus} = ${'generated'} and ${proposicaoResumoIa.reviewStatus} = ${'approved'} and ${proposicaoResumoIa.resumoCard} is not null`;

const TEXTO_BUSCA = sql`${semAcento(proposicao.ementa)} || ' ' || ${semAcento(proposicao.keywords)} || ' ' || case when ${RESUMO_IA_PUBLICO} then ${semAcento(proposicaoResumoIa.resumoCard)} || ' ' || ${semAcento(proposicaoResumoIa.resumoDetalhe)} else '' end`;

export type ProposicoesSearchSql = {
  readonly where: SQL;
  readonly orderBy: SQL | null;
};

export type ProposicoesSearchContext = {
  readonly tema?: number;
};

export function toSearchSql(
  plan: ProposicoesSearchPlan,
  context: ProposicoesSearchContext = {},
): ProposicoesSearchSql {
  if (plan.kind === 'semantic') {
    return {
      where: semanticCondition(plan.embedding, context.tema),
      orderBy: sql`${distancia(proposicaoEmbedding.embedding, plan.embedding)} asc`,
    };
  }

  return { where: toSearchCondition(plan), orderBy: null };
}

export function toSearchCondition(plan: ProposicoesSearchPlan): SQL {
  if (plan.kind === 'citation') {
    return citationCondition(plan.citation);
  }

  if (plan.kind === 'semantic') {
    return semanticCondition(plan.embedding, undefined);
  }

  return and(...plan.tokens.map(tokenCondition)) as SQL;
}

function toLikePattern(token: string): string {
  return `%${token.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}

function tokenCondition(token: string): SQL {
  return or(
    sql`${TEXTO_BUSCA} like ${toLikePattern(token)}`,
    sql`${semAcento(proposicao.siglaTipo)} = ${token}`,
    sql`${proposicao.numero}::text = ${token}`,
    sql`${proposicao.ano}::text = ${token}`,
  ) as SQL;
}

function citationCondition(citation: Citation): SQL {
  return and(
    sql`${proposicao.numero} = ${Number(citation.numero)}`,
    citation.siglaTipo === undefined
      ? undefined
      : sql`${semAcento(proposicao.siglaTipo)} = ${citation.siglaTipo}`,
    citation.ano === undefined
      ? undefined
      : sql`${proposicao.ano} = ${Number(citation.ano)}`,
  ) as SQL;
}

// Os filtros entram dentro da subquery: o corte por proximidade tem de recair
// sobre o conjunto ja filtrado, senao uma busca com tema devolve quase nada.
function semanticCondition(
  embedding: readonly number[],
  tema: number | undefined,
): SQL {
  const candidato = alias(proposicaoEmbedding, 'candidato_embedding');
  const computavel = alias(proposicaoComputavel, 'candidato_computavel');
  const temaCondition =
    tema === undefined
      ? undefined
      : sql`exists (select 1 from ${proposicaoTema} where ${proposicaoTema.proposicaoId} = ${candidato.proposicaoId} and ${proposicaoTema.externalCodTema} = ${tema})`;

  return sql`${proposicao.id} in (
    select ${candidato.proposicaoId}
    from ${proposicaoEmbedding} ${candidato}
    join ${proposicaoComputavel} ${computavel} on ${computavel.proposicaoId} = ${candidato.proposicaoId}
    ${temaCondition === undefined ? sql`` : sql`where ${temaCondition}`}
    order by ${distancia(candidato.embedding, embedding)} asc
    limit ${SEMANTIC_CANDIDATE_LIMIT}
  )`;
}

// O cast explicito evita depender de como o driver tipa o parametro do vetor.
function distancia(column: SQLWrapper, embedding: readonly number[]): SQL {
  return sql`${column} <=> ${JSON.stringify([...embedding])}::vector`;
}
