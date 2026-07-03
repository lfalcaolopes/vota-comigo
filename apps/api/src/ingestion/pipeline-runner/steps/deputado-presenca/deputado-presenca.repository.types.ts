import type { VotoCategoria } from '@vota-comigo/shared-types';

import type { EventoExercicio } from '@/exercicio/types/exercicio.types';

export type DeputadoComHistoricoRow = {
  deputadoId: string;
  eventos: readonly EventoExercicio[];
};

export type ComputableVotacaoRow = {
  votacaoId: string;
  dataHoraRegistro: string | null;
  data: string | null;
  votosJson: Readonly<Record<VotoCategoria, readonly string[]>>;
};

export type DeputadoPresencaRow = {
  deputadoId: string;
  presencas: number;
  ausenciasSemMotivoConhecido: number;
  foraDeExercicio: number;
  lacunaDeDados: number;
  ruleVersion: number;
};

export type DeputadoPresencaRefreshResult = {
  inserted: number;
};

export type DeputadoPresencaRepository = {
  loadDeputadosComHistorico(): Promise<readonly DeputadoComHistoricoRow[]>;
  loadComputableVotacoes(): Promise<readonly ComputableVotacaoRow[]>;
  fullReplace(
    rows: readonly DeputadoPresencaRow[],
  ): Promise<DeputadoPresencaRefreshResult>;
};
