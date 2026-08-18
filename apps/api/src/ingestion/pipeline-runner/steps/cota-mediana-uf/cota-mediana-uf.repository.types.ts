import type { IntervaloExercicio } from '@/exercicio/types/exercicio.types';
import type { CoberturaCotaSigepa } from '@/shared/cota/ano-reposto';
import type { GastosSigepaJson } from '@/shared/cota/reposicao-sigepa';

import type { GastoCotaJson } from '../deputado-gasto-cota/deputado-gasto-cota.repository.types';

export type CoberturaAnualRow = CoberturaCotaSigepa & {
  year: number;
};

export type GastoCotaAnualRow = {
  deputadoId: string;
  siglaUf: string;
  gastosJson: GastoCotaJson;
  // Espelho do dump e reposição chegam separados: quem mescla é o módulo da
  // janela, na leitura (ADR 022).
  gastosSigepaJson: GastosSigepaJson | null;
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
  loadCoberturas(): Promise<readonly CoberturaAnualRow[]>;
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
