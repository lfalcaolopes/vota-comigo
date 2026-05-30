import { bigint, char, date, pgTable, text, uuid } from 'drizzle-orm/pg-core';

import { legislatura } from './legislatura';

export const deputado = pgTable('deputado', {
  id: uuid('id').primaryKey().defaultRandom(),
  externalIdDeputado: bigint('external_id_deputado', { mode: 'number' })
    .notNull()
    .unique(),
  uri: text('uri'),
  nome: text('nome'),
  nomeCivil: text('nome_civil'),
  siglaSexo: char('sigla_sexo', { length: 1 }),
  dataNascimento: date('data_nascimento'),
  dataFalecimento: date('data_falecimento'),
  ufNascimento: char('uf_nascimento', { length: 2 }),
  municipioNascimento: text('municipio_nascimento'),
  urlRedeSocial: text('url_rede_social'),
  urlWebsite: text('url_website'),
  legislaturaInicialId: uuid('legislatura_inicial_id').references(
    () => legislatura.id,
  ),
  legislaturaFinalId: uuid('legislatura_final_id').references(
    () => legislatura.id,
  ),
});
