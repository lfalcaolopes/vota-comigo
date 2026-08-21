import type {
  GastosCotaJson,
  GastosSigepaJson,
} from '@/shared/cota/reposicao-sigepa';

export type CotaCategoria = {
  externalNumSubCota: number;
  description: string;
};

export type CotaGastoAno = {
  deputadoId: string;
  year: number;
  gastosJson: GastosCotaJson;
};

export type CotaGastoSigepaAno = {
  deputadoId: string;
  year: number;
  gastosJson: GastosSigepaJson;
};
