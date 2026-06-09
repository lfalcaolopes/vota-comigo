import { z } from 'zod';

export const votoCategoria = z.enum([
  'sim',
  'nao',
  'abstencao',
  'obstrucao',
  'artigo_17',
  'nao_informado',
]);

export const deputadoVotacaoClassification = z.enum([
  'lacuna_de_dados',
  'fora_de_exercicio',
  'artigo_17',
  'voto_nao_informado',
  'sim',
  'nao',
  'abstencao',
  'obstrucao',
  'ausencia_sem_motivo_conhecido',
]);

export type VotoCategoria = z.infer<typeof votoCategoria>;
export type DeputadoVotacaoClassification = z.infer<
  typeof deputadoVotacaoClassification
>;
