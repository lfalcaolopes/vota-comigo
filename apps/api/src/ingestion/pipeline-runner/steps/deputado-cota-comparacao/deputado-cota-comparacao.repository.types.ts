import type { ComparativoCota } from '@vota-comigo/shared-types';

import type { LegislaturaPeriodo } from '@/comparativo-deputados/rules/janela-comparativo';
import type { IntervaloExercicio } from '@/exercicio/types/exercicio.types';
import type { CoberturaCotaSigepa } from '@/shared/cota/ano-reposto';
import type { GastosSigepaJson } from '@/shared/cota/reposicao-sigepa';

import type { GastoCotaJson } from '../deputado-gasto-cota/deputado-gasto-cota.repository.types';

export type CoberturaAnualRow = CoberturaCotaSigepa & {
  year: number;
};

export type DeputadoJanelaRow = {
  deputadoId: string;
  legislaturaFinal: number | null;
  legislaturaFinalPeriodo: { dataInicio: string; dataFim: string } | null;
};

export type MedianaUfRow = {
  year: number;
  siglaUf: string;
  amountUsedCents: number;
  deputadoCount: number;
};

export type GastoCotaRow = {
  deputadoId: string;
  year: number;
  siglaUf: string;
  gastosJson: GastoCotaJson;
  // Espelho do dump e reposição chegam separados: quem mescla é o módulo da
  // janela, na leitura (ADR 022).
  gastosSigepaJson: GastosSigepaJson | null;
};

export type DeputadoCotaComparacaoRow = {
  deputadoId: string;
  legislatura: number;
  referencia: string;
  cota: ComparativoCota;
};

export type DeputadoCotaComparacaoRepository = {
  loadCoberturas(): Promise<readonly CoberturaAnualRow[]>;
  loadDeputados(): Promise<readonly DeputadoJanelaRow[]>;
  loadGastos(deputadoIds: readonly string[]): Promise<readonly GastoCotaRow[]>;
  loadIntervalosByDeputadoId(): Promise<
    ReadonlyMap<string, readonly IntervaloExercicio[]>
  >;
  loadLegislaturas(): Promise<readonly LegislaturaPeriodo[]>;
  loadMedianas(): Promise<readonly MedianaUfRow[]>;
  replaceAll(
    rows: readonly DeputadoCotaComparacaoRow[],
  ): Promise<{ inserted: number }>;
};
