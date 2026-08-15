import { and, or, sql, type SQL, type SQLWrapper } from 'drizzle-orm';

import { proposicao, proposicaoResumoIa } from '@/shared/database/schema';

import type {
  Citation,
  ProposicoesSearchPlan,
} from '../rules/proposicoes-search';

// Espelha normalizeText do planner: os dois lados da comparacao chegam sem
// acento e em minusculas. translate e imutavel e nao depende de extensao.
const COM_ACENTO = 'áàâãäéèêëíìîïóòôõöúùûüçñýÿ';
const SEM_ACENTO = 'aaaaaeeeeiiiiooooouuuucnyy';

function semAcento(value: SQLWrapper): SQL {
  return sql`translate(lower(coalesce(${value}, '')), ${COM_ACENTO}, ${SEM_ACENTO})`;
}

// Mesmo gate de toResumoIaCardFields: resumo nao publico nao pode ser
// alcancado pela busca, senao vira canal de leitura do que nao foi aprovado.
const RESUMO_IA_PUBLICO = sql`${proposicaoResumoIa.generationStatus} = ${'generated'} and ${proposicaoResumoIa.reviewStatus} = ${'approved'} and ${proposicaoResumoIa.resumoCard} is not null`;

const TEXTO_BUSCA = sql`${semAcento(proposicao.ementa)} || ' ' || ${semAcento(proposicao.keywords)} || ' ' || case when ${RESUMO_IA_PUBLICO} then ${semAcento(proposicaoResumoIa.resumoCard)} || ' ' || ${semAcento(proposicaoResumoIa.resumoDetalhe)} else '' end`;

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

export function toSearchCondition(plan: ProposicoesSearchPlan): SQL {
  if (plan.kind === 'citation') {
    return citationCondition(plan.citation);
  }

  return and(...plan.tokens.map(tokenCondition)) as SQL;
}
