import {
  bigint,
  date,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

export const escopoVotacao = pgEnum('escopo_votacao', ['plenario', 'comissao']);

export const votacao = pgTable('votacao', {
  id: uuid('id').primaryKey().defaultRandom(),
  externalIdVotacao: text('external_id_votacao').notNull().unique(),
  uri: text('uri'),
  data: date('data'),
  dataHoraRegistro: timestamp('data_hora_registro', {
    withTimezone: true,
    mode: 'string',
  }),
  externalIdOrgao: bigint('external_id_orgao', { mode: 'number' }),
  siglaOrgao: text('sigla_orgao'),
  escopoVotacao: escopoVotacao('escopo_votacao').notNull(),
  externalIdEvento: bigint('external_id_evento', { mode: 'number' }),
  aprovacao: integer('aprovacao'),
  votosSim: integer('votos_sim'),
  votosNao: integer('votos_nao'),
  votosOutros: integer('votos_outros'),
  descricao: text('descricao'),
  ultimaAberturaVotacaoDataHoraRegistro: timestamp(
    'ultima_abertura_votacao_data_hora_registro',
    { withTimezone: true, mode: 'string' },
  ),
  ultimaAberturaVotacaoDescricao: text('ultima_abertura_votacao_descricao'),
  ultimaApresentacaoProposicaoDataHoraRegistro: timestamp(
    'ultima_apresentacao_proposicao_data_hora_registro',
    { withTimezone: true, mode: 'string' },
  ),
  ultimaApresentacaoProposicaoDescricao: text(
    'ultima_apresentacao_proposicao_descricao',
  ),
  externalIdProposicaoUltimaApresentacao: bigint(
    'external_id_proposicao_ultima_apresentacao',
    { mode: 'number' },
  ),
  uriProposicaoUltimaApresentacao: text('uri_proposicao_ultima_apresentacao'),
});
