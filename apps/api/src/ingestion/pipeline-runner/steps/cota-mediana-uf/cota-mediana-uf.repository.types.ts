import type { IntervaloExercicio } from '@/exercicio/types/exercicio.types';

import type { GastoCotaJson } from '../deputado-gasto-cota/deputado-gasto-cota.repository.types';

export type GastoCotaAnualRow = {
  deputadoId: string;
  siglaUf: string;
  gastosJson: GastoCotaJson;
};

export type GastoCotaAnualDeputado = {
  deputadoId: string;
  siglaUf: string;
  valorUtilizadoCentavos: number;
  intervalos: readonly IntervaloExercicio[];
};

export type CotaMedianaUfRow = {
  year: number;
  siglaUf: string;
  valorUtilizadoMedianaCentavos: number;
  deputadoCount: number;
};

export type CotaMedianaUfRepository = {
  loadAnosComCobertura(): Promise<readonly number[]>;
  loadDatasInicioLegislatura(): Promise<readonly string[]>;
  loadGastosAnuais(year: number): Promise<readonly GastoCotaAnualRow[]>;
  loadIntervalosByDeputadoId(): Promise<
    ReadonlyMap<string, readonly IntervaloExercicio[]>
  >;
  replaceAno(
    year: number,
    rows: readonly CotaMedianaUfRow[],
  ): Promise<{ inserted: number }>;
};
