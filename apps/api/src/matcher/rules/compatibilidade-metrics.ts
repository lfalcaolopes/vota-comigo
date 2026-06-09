import type { DeputadoVotacaoClassification } from '@vota-comigo/shared-types';

export const FORA_DO_DENOMINADOR: ReadonlySet<DeputadoVotacaoClassification> =
  new Set([
    'fora_de_exercicio',
    'artigo_17',
    'voto_nao_informado',
    'lacuna_de_dados',
  ]);

export const FORA_DE_EXERCICIO: ReadonlySet<DeputadoVotacaoClassification> =
  new Set(['fora_de_exercicio', 'lacuna_de_dados']);

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
