import {
  bigint,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

import { deputado } from './deputado';

// Materializada na carga: em runtime, cada página do feed teria que somar
// gastos de vários anos, por deputado, dentro de gastos_json aninhado.
// Uma linha por deputado, sempre a última legislatura em que ele atuou; quem
// não tem janela comparável simplesmente não tem linha.
export const deputadoCotaComparacao = pgTable(
  'deputado_cota_comparacao',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    deputadoId: uuid('deputado_id')
      .notNull()
      .references(() => deputado.id),
    legislatura: integer('legislatura').notNull(),
    status: text('status').notNull(),
    motivo: text('motivo'),
    percentualSobreMedianaUf: doublePrecision('percentual_sobre_mediana_uf'),
    // Pode ser negativo: cancelamentos de passagem aérea excedem o gasto do
    // período em janelas curtas.
    gastoNaComparacaoCents: bigint('gasto_na_comparacao_cents', {
      mode: 'number',
    }),
    // As duas réguas do gasto, somadas sobre os mesmos anos: a mediana dos
    // pares e o teto do próprio direito. O teto fica nulo quando algum ano em
    // comparação não tem tabela publicada para a UF.
    medianaNaComparacaoCents: bigint('mediana_na_comparacao_cents', {
      mode: 'number',
    }),
    tetoNaComparacaoCents: bigint('teto_na_comparacao_cents', {
      mode: 'number',
    }),
    siglaUf: text('sigla_uf'),
    anosNaComparacao: integer('anos_na_comparacao'),
    diasEmExercicio: integer('dias_em_exercicio'),
    diasNaComparacao: integer('dias_na_comparacao'),
    // Detalhamento ano a ano, na forma de ComparativoCotaAno. Guardado junto do
    // agregado para que o comparativo leia daqui em vez de recalcular a janela.
    anosJson: jsonb('anos_json').notNull(),
    // A janela de quem segue em exercício fecha em "hoje": sem registrar qual
    // "hoje" foi esse, o valor envelheceria sem que ninguém percebesse.
    referencia: date('referencia').notNull(),
  },
  (table) => [
    unique('deputado_cota_comparacao_deputado_id_unique').on(table.deputadoId),
    index('deputado_cota_comparacao_percentual_idx').on(
      table.percentualSobreMedianaUf,
    ),
  ],
);
