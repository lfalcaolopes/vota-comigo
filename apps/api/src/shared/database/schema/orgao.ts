import { bigint, integer, pgTable, text, uuid } from 'drizzle-orm/pg-core';

// Um órgão da Câmara (comissão, mesa diretora, plenário, ...). Grão: um
// registro por órgão, deduplicado pelo id externo da Câmara.
export const orgao = pgTable('orgao', {
  id: uuid('id').primaryKey().defaultRandom(),
  externalIdOrgao: bigint('external_id_orgao', { mode: 'number' })
    .notNull()
    .unique(),
  uri: text('uri'),
  sigla: text('sigla'),
  apelido: text('apelido'),
  nome: text('nome'),
  nomePublicacao: text('nome_publicacao'),
  externalCodTipoOrgao: integer('external_cod_tipo_orgao'),
  tipoOrgao: text('tipo_orgao'),
  casa: text('casa'),
});
