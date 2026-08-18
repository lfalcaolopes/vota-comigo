import { and, eq, inArray, sql } from 'drizzle-orm';

import type { DrizzleDatabase } from '@/shared/database/client';
import { toSearchCondition } from '@/proposicoes/repository/proposicoes-search.condition';
import type { ProposicoesSearchPlan } from '@/proposicoes/rules/proposicoes-search';
import {
  proposicao,
  proposicaoComputavel,
  proposicaoResumoIa,
} from '@/shared/database/schema';

import { semAcento, TEXTO_BUSCA, TEXTO_FORA_DO_CORPUS } from './corpus';
import type { TokenFalho } from './classificacao';

export type EsperadoDetalhe = {
  readonly externalIdProposicao: number;
  readonly existe: boolean;
  readonly computavel: boolean;
  readonly siglaTipoNormalizada: string;
  readonly numero: number | null;
  readonly ano: number | null;
  readonly corpus: string;
  readonly textoForaDoCorpus: string;
};

export async function loadEsperadoDetalhes(
  db: DrizzleDatabase,
  externalIds: readonly number[],
): Promise<ReadonlyMap<number, EsperadoDetalhe>> {
  if (externalIds.length === 0) {
    return new Map();
  }

  const rows = await db
    .select({
      externalIdProposicao: proposicao.externalIdProposicao,
      computavel: sql<boolean>`${proposicaoComputavel.id} is not null`,
      siglaTipoNormalizada: sql<string>`${semAcento(proposicao.siglaTipo)}`,
      numero: proposicao.numero,
      ano: proposicao.ano,
      corpus: sql<string>`${TEXTO_BUSCA}`,
      textoForaDoCorpus: sql<string>`${TEXTO_FORA_DO_CORPUS}`,
    })
    .from(proposicao)
    .leftJoin(
      proposicaoComputavel,
      eq(proposicaoComputavel.proposicaoId, proposicao.id),
    )
    .leftJoin(
      proposicaoResumoIa,
      eq(proposicaoResumoIa.proposicaoId, proposicao.id),
    )
    .where(inArray(proposicao.externalIdProposicao, [...externalIds]));

  return new Map(
    rows.map((row) => [
      row.externalIdProposicao,
      {
        externalIdProposicao: row.externalIdProposicao,
        existe: true,
        computavel: row.computavel,
        siglaTipoNormalizada: row.siglaTipoNormalizada,
        numero: row.numero,
        ano: row.ano,
        corpus: row.corpus,
        textoForaDoCorpus: row.textoForaDoCorpus,
      },
    ]),
  );
}

// Reusa toSearchCondition e os mesmos joins do feed: a autoridade sobre "casou
// ou nao casou" e o SQL de producao, nunca a reimplementacao em JS abaixo.
export async function satisfazCondicaoDeBusca(
  db: DrizzleDatabase,
  plano: ProposicoesSearchPlan,
  externalIdProposicao: number,
): Promise<boolean> {
  const rows = await db
    .select({ externalIdProposicao: proposicao.externalIdProposicao })
    .from(proposicaoComputavel)
    .innerJoin(proposicao, eq(proposicaoComputavel.proposicaoId, proposicao.id))
    .leftJoin(
      proposicaoResumoIa,
      eq(proposicaoResumoIa.proposicaoId, proposicao.id),
    )
    .where(
      and(
        toSearchCondition(plano),
        eq(proposicao.externalIdProposicao, externalIdProposicao),
      ),
    )
    .limit(1);

  return rows.length > 0;
}

// Espelha tokenCondition de proposicoes-search.condition.ts. So roda depois que
// satisfazCondicaoDeBusca ja provou, no SQL, que o documento nao casou: serve
// para explicar qual token derrubou, nao para decidir.
export function findTokensFalhos(
  tokens: readonly string[],
  detalhe: EsperadoDetalhe,
): readonly string[] {
  return tokens.filter((token) => {
    const casaCorpus = detalhe.corpus.includes(token);
    const casaSigla = detalhe.siglaTipoNormalizada === token;
    const casaNumero =
      detalhe.numero !== null && String(detalhe.numero) === token;
    const casaAno = detalhe.ano !== null && String(detalhe.ano) === token;
    return !(casaCorpus || casaSigla || casaNumero || casaAno);
  });
}

export async function describeTokensFalhos(
  db: DrizzleDatabase,
  tokensFalhos: readonly string[],
  detalhe: EsperadoDetalhe,
): Promise<readonly TokenFalho[]> {
  if (tokensFalhos.length === 0) {
    return [];
  }

  const radicais = await probeRadicais(db, detalhe.corpus, tokensFalhos);

  return tokensFalhos.map((token) => ({
    token,
    foraDoCorpus: detalhe.textoForaDoCorpus.includes(token),
    radicalNoCorpus: radicais.get(token) ?? false,
  }));
}

// Sonda de diagnostico apenas. A busca em producao nao usa tsvector; aqui o
// stemmer portugues so responde "existe palavra do mesmo radical no corpus?".
async function probeRadicais(
  db: DrizzleDatabase,
  corpus: string,
  tokens: readonly string[],
): Promise<ReadonlyMap<string, boolean>> {
  const values = sql.join(
    tokens.map((token) => sql`(${token}::text)`),
    sql`, `,
  );

  const rows = (await db.execute(
    sql`select v.token as token, to_tsvector('portuguese', ${corpus}::text) @@ plainto_tsquery('portuguese', v.token) as radical from (values ${values}) as v(token)`,
  )) as unknown as readonly { token: string; radical: boolean }[];

  return new Map(rows.map((row) => [row.token, row.radical === true]));
}
