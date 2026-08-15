import { resolveVotacaoTimestamp } from '@/exercicio/rules/intervalos-exercicio';
import { toEpochMillis } from '@/exercicio/rules/instante';
import type { EventoExercicio } from '@/exercicio/types/exercicio.types';

import {
  deriveResumoPresenca,
  type ResumoPresencaResult,
  type VotacaoParaPresenca,
} from './resumo-presenca';

export type LegislaturaJanelaPresenca = {
  legislaturaId: string;
  dataInicio: string;
  dataFim: string;
};

export type ResumoPresencaDaLegislatura = { legislaturaId: string } &
  ResumoPresencaResult;

export type DeriveResumoPresencaPorLegislaturaInput = {
  eventos: readonly EventoExercicio[];
  votacoes: readonly VotacaoParaPresenca[];
  legislaturas: readonly LegislaturaJanelaPresenca[];
};

export function deriveResumoPresencaPorLegislatura(
  input: DeriveResumoPresencaPorLegislaturaInput,
): readonly ResumoPresencaDaLegislatura[] {
  const janelas = input.legislaturas.flatMap((legislatura) => {
    const inicio = toEpochMillis(legislatura.dataInicio);
    const fim = toEpochMillis(legislatura.dataFim);
    return inicio === null || fim === null
      ? []
      : [{ legislatura, inicio, fim }];
  });

  return janelas.flatMap(({ legislatura, inicio, fim }) => {
    const votacoesDaJanela = input.votacoes.filter((votacaoParaPresenca) => {
      // Votação sem timestamp utilizável não pertence a nenhuma janela: ela
      // já só alimentava lacunaDeDados, contador que nenhum consumidor lê.
      const instante = resolveVotacaoTimestamp(votacaoParaPresenca.votacao);
      return instante !== null && instante >= inicio && instante <= fim;
    });

    const resultado = deriveResumoPresenca({
      eventos: input.eventos,
      votacoes: votacoesDaJanela,
    });

    if (!resultado.resumoPresencaDisponivel) {
      return [];
    }

    return [{ legislaturaId: legislatura.legislaturaId, ...resultado }];
  });
}
