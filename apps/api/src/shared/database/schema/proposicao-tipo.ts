import { bigint, pgTable, text, uuid } from 'drizzle-orm/pg-core';

// sigla_tipo é a chave de identidade: é a chave do composicao_json de
// deputado_proposicao_assinada, não external_cod_tipo.
export const proposicaoTipo = pgTable('proposicao_tipo', {
  id: uuid('id').primaryKey().defaultRandom(),
  siglaTipo: text('sigla_tipo').notNull().unique(),
  descricaoTipo: text('descricao_tipo'),
  externalCodTipo: bigint('external_cod_tipo', { mode: 'number' }),
});
