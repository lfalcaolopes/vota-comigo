import { bigint, pgTable, unique, uuid } from 'drizzle-orm/pg-core';

import { proposicao } from './proposicao';
import { tema } from './tema';

export const proposicaoTema = pgTable(
  'proposicao_tema',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    externalIdProposicao: bigint('external_id_proposicao', {
      mode: 'number',
    }).notNull(),
    externalCodTema: bigint('external_cod_tema', { mode: 'number' }).notNull(),
    proposicaoId: uuid('proposicao_id')
      .notNull()
      .references(() => proposicao.id),
    temaId: uuid('tema_id')
      .notNull()
      .references(() => tema.id),
  },
  (table) => [
    unique('proposicao_tema_external_unique').on(
      table.externalIdProposicao,
      table.externalCodTema,
    ),
  ],
);
