import type {
  ComparativoCota,
  DeputadoCeapResponse,
  DeputadoPerfilValidYearRange,
} from '@vota-comigo/shared-types';

import { toDeputadoCeapLoadedResponse } from '@/deputados/mappers/deputado-ceap.mapper';
import { deriveDeputadoCeapState } from '@/deputados/rules/deputado-ceap-state';
import type { DeputadoCeapSource } from '@/deputados/types/deputados.types';

type ComparativoCotaInput = {
  year: number;
  validYearRange: DeputadoPerfilValidYearRange;
  source: DeputadoCeapSource;
};

type DeputadoCeapLoadedResponse = Extract<
  DeputadoCeapResponse,
  { coveredThroughMonth: number }
>;

export function toComparativoCota(
  input: ComparativoCotaInput,
): ComparativoCota {
  const state = deriveDeputadoCeapState({
    year: input.year,
    validYearRange: input.validYearRange,
    ingestedYears: input.source.coberturas.map((item) => item.year),
    hasGastos: input.source.gasto !== null,
  });
  const cobertura = input.source.coberturas.find(
    (item) => item.year === input.year,
  );
  if (
    state.status === null ||
    state.status === 'ano-nao-carregado' ||
    cobertura === undefined
  ) {
    return { status: 'ano-nao-carregado' };
  }

  // Passar pelo mapper do perfil garante que o comparativo projete exatamente
  // o mesmo agregado exibido lá antes de descartar o valor absoluto.
  const response = toDeputadoCeapLoadedResponse({
    year: input.year,
    availableYears: state.availableYears,
    status: state.status,
    coveredThroughMonth: cobertura.coveredThroughMonth,
    source: input.source,
  });

  return toComparativoCotaFromResponse(response);
}

function toComparativoCotaFromResponse(
  response: DeputadoCeapLoadedResponse,
): ComparativoCota {
  if (response.status === 'sem-gastos') {
    return { status: 'sem-comparacao', motivo: 'sem-gastos' };
  }

  if (!response.exercicioAnoCompleto) {
    return { status: 'sem-comparacao', motivo: 'exercicio-parcial' };
  }

  if (
    response.sigepaDataStatus === 'incompleto' ||
    response.siglaUf === null ||
    response.medianaUf === null ||
    response.medianaUf.amountUsedCents <= 0
  ) {
    return { status: 'sem-comparacao', motivo: 'dado-incompleto' };
  }

  return {
    status: 'comparavel',
    percentualSobreMedianaUf:
      (response.totalAmountUsedCents / response.medianaUf.amountUsedCents) *
      100,
    medianaUf: {
      siglaUf: response.siglaUf,
      deputadoCount: response.medianaUf.deputadoCount,
    },
  };
}
