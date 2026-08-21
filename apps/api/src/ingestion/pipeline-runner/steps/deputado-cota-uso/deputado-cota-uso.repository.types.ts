import type { IntervaloExercicio } from '@/exercicio/types/exercicio.types';
import type {
  UsoCotaApuracao,
  UsoCotaCobertura,
  UsoCotaGasto,
  UsoCotaLegislatura,
  UsoCotaUfPeriodo,
} from '@/shared/cota/uso-cota';

export type DeputadoCotaUsoSource = {
  deputadoId: string;
  externalIdDeputado: number;
  intervalosExercicio: readonly IntervaloExercicio[];
  gastos: readonly UsoCotaGasto[];
  ufs: readonly UsoCotaUfPeriodo[];
};

export type DeputadoCotaUsoRow = {
  deputadoId: string;
  apuracao: UsoCotaApuracao;
  referencia: string;
};

export type DeputadoCotaUsoRepository = {
  loadCoberturas(): Promise<readonly UsoCotaCobertura[]>;
  loadLegislaturas(): Promise<readonly UsoCotaLegislatura[]>;
  loadDeputados(): Promise<readonly DeputadoCotaUsoSource[]>;
  replaceAll(
    rows: readonly DeputadoCotaUsoRow[],
  ): Promise<{ inserted: number }>;
};
