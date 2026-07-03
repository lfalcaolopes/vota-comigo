import type { EventoExercicio } from '@/exercicio/types/exercicio.types';

export type DeputadoComHistoricoRow = {
  deputadoId: string;
  eventos: readonly EventoExercicio[];
};

export type DeputadoExercicioIntervaloRow = {
  deputadoId: string;
  openedAt: string;
  closedAt: string | null;
  ruleVersion: number;
};

export type DeputadoExercicioIntervaloRefreshResult = {
  inserted: number;
};

export type DeputadoExercicioIntervaloRepository = {
  loadDeputadosComHistorico(): Promise<readonly DeputadoComHistoricoRow[]>;
  fullReplace(
    rows: readonly DeputadoExercicioIntervaloRow[],
  ): Promise<DeputadoExercicioIntervaloRefreshResult>;
};
