import {
  bigint,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

export const proposicao = pgTable('proposicao', {
  id: uuid('id').primaryKey().defaultRandom(),
  externalIdProposicao: bigint('external_id_proposicao', { mode: 'number' })
    .notNull()
    .unique(),
  uri: text('uri'),
  siglaTipo: text('sigla_tipo'),
  numero: integer('numero'),
  ano: integer('ano'),
  externalCodTipo: bigint('external_cod_tipo', { mode: 'number' }),
  descricaoTipo: text('descricao_tipo'),
  ementa: text('ementa'),
  ementaDetalhada: text('ementa_detalhada'),
  keywords: text('keywords'),
  dataApresentacao: timestamp('data_apresentacao', {
    withTimezone: true,
    mode: 'string',
  }),
  urlInteiroTeor: text('url_inteiro_teor'),
  ultimoStatusDataHora: timestamp('ultimo_status_data_hora', {
    withTimezone: true,
    mode: 'string',
  }),
  ultimoStatusSiglaOrgao: text('ultimo_status_sigla_orgao'),
  ultimoStatusRegime: text('ultimo_status_regime'),
  ultimoStatusDescricaoSituacao: text('ultimo_status_descricao_situacao'),
});
