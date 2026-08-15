import type { ComparativoJanela } from '@vota-comigo/shared-types';

import type { IntervaloExercicio } from '@/exercicio/types/exercicio.types';

import { toEpochMillis } from '../../exercicio/rules/instante';

const DIA_EM_MILLIS = 24 * 60 * 60 * 1000;
const LEGISLATURA_MINIMA_COMPARATIVO = 55;

export type LegislaturaPeriodo = {
  legislatura: number;
  dataInicio: string;
  dataFim: string;
};

export type LegislaturaFinalDeputado = {
  legislatura: number | null;
  periodo: { dataInicio: string; dataFim: string } | null;
};

export type DeriveJanelaComparativoInput = {
  intervalosExercicio: readonly IntervaloExercicio[];
  legislaturas: readonly LegislaturaPeriodo[];
  legislaturaFinal: LegislaturaFinalDeputado;
  referencia: string;
};

type IntervaloUsavel = { abertura: number; fechamento: number };

type LegislaturaUsavel = {
  legislatura: number;
  dataInicio: string;
  dataFim: string;
  inicioEpoch: number;
  fimEpoch: number;
};

function toIntervalosUsaveis(
  intervalos: readonly IntervaloExercicio[],
): readonly IntervaloUsavel[] {
  return intervalos
    .flatMap((intervalo) => {
      const abertura = toEpochMillis(intervalo.openedAt);
      const fechamento =
        intervalo.closedAt === null
          ? Number.POSITIVE_INFINITY
          : toEpochMillis(intervalo.closedAt);

      return abertura === null || fechamento === null
        ? []
        : [{ abertura, fechamento }];
    })
    .sort((a, b) => a.abertura - b.abertura);
}

function toLegislaturasUsaveis(
  legislaturas: readonly LegislaturaPeriodo[],
): readonly LegislaturaUsavel[] {
  return legislaturas
    .flatMap((periodo) => {
      const inicioEpoch = toEpochMillis(periodo.dataInicio);
      const fimEpoch = toEpochMillis(periodo.dataFim);

      return inicioEpoch === null || fimEpoch === null
        ? []
        : [{ ...periodo, inicioEpoch, fimEpoch }];
    })
    .sort((a, b) => a.inicioEpoch - b.inicioEpoch);
}

function findLegislaturaEm(
  legislaturas: readonly LegislaturaUsavel[],
  epoch: number,
): LegislaturaUsavel | null {
  return (
    legislaturas
      .filter((legislatura) => legislatura.inicioEpoch <= epoch)
      .at(-1) ?? null
  );
}

function somarDiasEmExercicio(
  intervalos: readonly IntervaloUsavel[],
  inicioEpoch: number,
  fimEpoch: number,
): number {
  const clipados = intervalos
    .map((intervalo) => ({
      abertura: Math.max(intervalo.abertura, inicioEpoch),
      fechamento: Math.min(intervalo.fechamento, fimEpoch),
    }))
    .filter((intervalo) => intervalo.fechamento > intervalo.abertura)
    .sort((a, b) => a.abertura - b.abertura);

  let totalMillis = 0;
  let mescladoFim = Number.NEGATIVE_INFINITY;
  let mescladoInicio = Number.NEGATIVE_INFINITY;

  for (const { abertura, fechamento } of clipados) {
    if (abertura > mescladoFim) {
      totalMillis +=
        mescladoFim - mescladoInicio > 0 ? mescladoFim - mescladoInicio : 0;
      mescladoInicio = abertura;
      mescladoFim = fechamento;
    } else {
      mescladoFim = Math.max(mescladoFim, fechamento);
    }
  }
  totalMillis +=
    mescladoFim - mescladoInicio > 0 ? mescladoFim - mescladoInicio : 0;

  return Math.round(totalMillis / DIA_EM_MILLIS);
}

function janelaIndisponivelSemLegislatura(): ComparativoJanela {
  return {
    status: 'indisponivel',
    motivo: 'sem-legislatura-registrada',
    ultimaLegislatura: null,
  };
}

function janelaIndisponivelAbaixoDoPiso(
  legislatura: number,
): ComparativoJanela {
  return {
    status: 'indisponivel',
    motivo: 'legislatura-anterior-a-cobertura',
    ultimaLegislatura: legislatura,
  };
}

function deriveJanelaFallback(
  legislaturaFinal: LegislaturaFinalDeputado,
  referenciaEpoch: number,
): ComparativoJanela {
  const { legislatura, periodo } = legislaturaFinal;
  if (legislatura === null || periodo === null) {
    return janelaIndisponivelSemLegislatura();
  }

  if (legislatura < LEGISLATURA_MINIMA_COMPARATIVO) {
    return janelaIndisponivelAbaixoDoPiso(legislatura);
  }

  const fimEpoch = toEpochMillis(periodo.dataFim);

  return {
    status: 'disponivel',
    legislatura,
    dataInicio: periodo.dataInicio,
    dataFim: periodo.dataFim,
    encerrada: fimEpoch === null ? true : fimEpoch <= referenciaEpoch,
    diasEmExercicioDisponivel: false,
    diasEmExercicio: null,
  };
}

export function deriveJanelaComparativo(
  input: DeriveJanelaComparativoInput,
): ComparativoJanela {
  const referenciaEpoch = toEpochMillis(input.referencia);
  const intervalosUsaveis = toIntervalosUsaveis(input.intervalosExercicio);

  if (intervalosUsaveis.length === 0 || referenciaEpoch === null) {
    return deriveJanelaFallback(
      input.legislaturaFinal,
      referenciaEpoch ?? Number.POSITIVE_INFINITY,
    );
  }

  const ultimoIntervalo = intervalosUsaveis.at(-1)!;
  const ancoraEpoch =
    ultimoIntervalo.fechamento === Number.POSITIVE_INFINITY
      ? referenciaEpoch
      : ultimoIntervalo.fechamento;

  const legislaturasUsaveis = toLegislaturasUsaveis(input.legislaturas);
  const legislaturaEncontrada = findLegislaturaEm(
    legislaturasUsaveis,
    ancoraEpoch,
  );

  if (legislaturaEncontrada === null) {
    return deriveJanelaFallback(input.legislaturaFinal, referenciaEpoch);
  }

  if (legislaturaEncontrada.legislatura < LEGISLATURA_MINIMA_COMPARATIVO) {
    return janelaIndisponivelAbaixoDoPiso(legislaturaEncontrada.legislatura);
  }

  const abertoNoFim = ultimoIntervalo.fechamento === Number.POSITIVE_INFINITY;
  const dataFim = abertoNoFim
    ? legislaturaEncontrada.dataFim
    : new Date(ultimoIntervalo.fechamento).toISOString();
  const fimJanelaEpoch = abertoNoFim
    ? legislaturaEncontrada.fimEpoch
    : ultimoIntervalo.fechamento;

  return {
    status: 'disponivel',
    legislatura: legislaturaEncontrada.legislatura,
    dataInicio: legislaturaEncontrada.dataInicio,
    dataFim,
    encerrada: !abertoNoFim,
    diasEmExercicioDisponivel: true,
    diasEmExercicio: somarDiasEmExercicio(
      intervalosUsaveis,
      legislaturaEncontrada.inicioEpoch,
      Math.min(fimJanelaEpoch, referenciaEpoch),
    ),
  };
}
