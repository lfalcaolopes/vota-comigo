import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { sql, type SQL, type SQLWrapper } from 'drizzle-orm';

import { proposicao, proposicaoResumoIa } from '@/shared/database/schema';

export const CONDITION_SOURCE_PATH = resolve(
  __dirname,
  '../../src/proposicoes/repository/proposicoes-search.condition.ts',
);

// Copia literal de proposicoes-search.condition.ts. assertCorpusMatchesProduction
// aborta o diagnostico se a producao divergir desta copia.
const COM_ACENTO = 'áàâãäéèêëíìîïóòôõöúùûüçñýÿ';
const SEM_ACENTO = 'aaaaaeeeeiiiiooooouuuucnyy';

export function semAcento(value: SQLWrapper): SQL {
  return sql`translate(lower(coalesce(${value}, '')), ${COM_ACENTO}, ${SEM_ACENTO})`;
}

export const RESUMO_IA_PUBLICO = sql`${proposicaoResumoIa.generationStatus} = ${'generated'} and ${proposicaoResumoIa.reviewStatus} = ${'approved'} and ${proposicaoResumoIa.resumoCard} is not null`;

export const TEXTO_BUSCA = sql`${semAcento(proposicao.ementa)} || ' ' || ${semAcento(proposicao.keywords)} || ' ' || case when ${RESUMO_IA_PUBLICO} then ${semAcento(proposicaoResumoIa.resumoCard)} || ' ' || ${semAcento(proposicaoResumoIa.resumoDetalhe)} else '' end`;

// Campos textuais da proposicao que a busca NAO varre. Alimentam a categoria
// FORA_DO_CORPUS: o termo existe no documento, mas nao onde a busca olha.
export const TEXTO_FORA_DO_CORPUS = sql`${semAcento(proposicao.ementaDetalhada)} || ' ' || ${semAcento(proposicao.descricaoTipo)} || ' ' || case when ${RESUMO_IA_PUBLICO} then '' else ${semAcento(proposicaoResumoIa.resumoCard)} || ' ' || ${semAcento(proposicaoResumoIa.resumoDetalhe)} end`;

export const CORPUS_COLUNAS = [
  'proposicao.ementa',
  'proposicao.keywords',
  'proposicao_resumo_ia.resumo_card',
  'proposicao_resumo_ia.resumo_detalhe',
] as const;

export const CORPUS_DESCRICAO =
  "translate(lower(coalesce(ementa,''))) || ' ' || translate(lower(coalesce(keywords,''))) || ' ' || " +
  "case when <resumo IA publico> then translate(lower(coalesce(resumo_card,''))) || ' ' || translate(lower(coalesce(resumo_detalhe,''))) else '' end";

export const RESUMO_IA_PUBLICO_DESCRICAO =
  "generation_status = 'generated' and review_status = 'approved' and resumo_card is not null";

const TEXTO_BUSCA_REFS_ESPERADAS = [
  'proposicao.ementa',
  'proposicao.keywords',
  'proposicaoResumoIa.resumoCard',
  'proposicaoResumoIa.resumoDetalhe',
];

const RESUMO_IA_PUBLICO_REFS_ESPERADAS = [
  'proposicaoResumoIa.generationStatus',
  'proposicaoResumoIa.reviewStatus',
  'proposicaoResumoIa.resumoCard',
];

export function assertCorpusMatchesProduction(): void {
  const source = readFileSync(CONDITION_SOURCE_PATH, 'utf8');

  assertLiteral(source, 'COM_ACENTO', COM_ACENTO);
  assertLiteral(source, 'SEM_ACENTO', SEM_ACENTO);

  const textoBusca = extractSqlStatement(source, 'TEXTO_BUSCA');
  const resumoPublico = extractSqlStatement(source, 'RESUMO_IA_PUBLICO');

  assertRefs('TEXTO_BUSCA', textoBusca, TEXTO_BUSCA_REFS_ESPERADAS);
  assertRefs(
    'RESUMO_IA_PUBLICO',
    resumoPublico,
    RESUMO_IA_PUBLICO_REFS_ESPERADAS,
  );

  if (!textoBusca.includes('RESUMO_IA_PUBLICO')) {
    throw new Error(
      abortMessage(
        'TEXTO_BUSCA nao referencia mais RESUMO_IA_PUBLICO: o gate de resumo publico mudou.',
      ),
    );
  }

  for (const literal of ["'generated'", "'approved'"]) {
    if (!resumoPublico.includes(literal)) {
      throw new Error(
        abortMessage(
          `RESUMO_IA_PUBLICO nao usa mais o literal ${literal}: o gate de resumo publico mudou.`,
        ),
      );
    }
  }

  if (!textoBusca.includes("|| ' ' ||")) {
    throw new Error(
      abortMessage(
        'TEXTO_BUSCA nao concatena mais as colunas com separador de espaco.',
      ),
    );
  }
}

function extractSqlStatement(source: string, name: string): string {
  const opening = 'const ' + name + ' = sql`';
  const start = source.indexOf(opening);
  if (start === -1) {
    throw new Error(
      abortMessage(`nao encontrei "const ${name} = sql\`" na producao.`),
    );
  }

  const bodyStart = start + opening.length;
  const end = source.indexOf('`;', bodyStart);
  if (end === -1) {
    throw new Error(
      abortMessage(`o template de ${name} nao termina como esperado.`),
    );
  }

  return source.slice(bodyStart, end);
}

function assertLiteral(source: string, name: string, expected: string): void {
  const match = new RegExp(`const ${name} = '([^']*)';`).exec(source);
  if (match === null) {
    throw new Error(
      abortMessage(`nao encontrei "const ${name} = '...'" na producao.`),
    );
  }
  if (match[1] !== expected) {
    throw new Error(
      abortMessage(
        `${name} divergiu. Producao: ${JSON.stringify(match[1])}. Diagnostico: ${JSON.stringify(expected)}.`,
      ),
    );
  }
}

function assertRefs(
  name: string,
  statement: string,
  expected: readonly string[],
): void {
  const found = [
    ...statement.matchAll(/\b(proposicao|proposicaoResumoIa)\.(\w+)/g),
  ].map((match) => `${match[1]}.${match[2]}`);

  const same =
    found.length === expected.length &&
    found.every((ref, index) => ref === expected[index]);

  if (!same) {
    throw new Error(
      abortMessage(
        `as colunas de ${name} divergiram. Producao: [${found.join(', ')}]. Diagnostico: [${expected.join(', ')}].`,
      ),
    );
  }
}

function abortMessage(detail: string): string {
  return [
    'Abortado: o corpus do diagnostico nao e mais identico ao corpus varrido pela busca.',
    detail,
    `Fonte comparada: ${CONDITION_SOURCE_PATH}`,
    'Atualize apps/api/scripts/diagnostico-busca/corpus.ts para espelhar a producao antes de classificar qualquer ausencia.',
  ].join('\n');
}
