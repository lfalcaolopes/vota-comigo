import type { ComparativoJanela } from '@vota-comigo/shared-types';

import type { IntervaloExercicio } from '@/exercicio/types/exercicio.types';

import { somarDiasEmExercicio } from '../../exercicio/rules/exercicio-ano';
import { toEpochMillis } from '../../exercicio/rules/instante';

const LEGISLATURA_MINIMA_COMPARATIVO = 55;

// A cobertura de dados (coberturaAte/divisorAnosEfetivos) só é conhecida
// depois de consultar os sinais de ingestão, então esta regra — que não faz
// I/O — devolve a janela sem esses dois campos; o serviço completa com
// deriveCoberturaJanela antes de expor o contrato.
export type JanelaComparativoSemCobertura =
  | Omit<
      Extract<ComparativoJanela, { status: 'disponivel' }>,
      'coberturaAte' | 'divisorAnosEfetivos'
    >
  | Extract<ComparativoJanela, { status: 'indisponivel' }>;

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

function janelaIndisponivelSemLegislatura(): JanelaComparativoSemCobertura {
  return {
    status: 'indisponivel',
    motivo: 'sem-legislatura-registrada',
    ultimaLegislatura: null,
  };
}

function janelaIndisponivelAbaixoDoPiso(
  legislatura: number,
): JanelaComparativoSemCobertura {
  return {
    status: 'indisponivel',
    motivo: 'legislatura-anterior-a-cobertura',
    ultimaLegislatura: legislatura,
  };
}

function deriveJanelaFallback(
  legislaturaFinal: LegislaturaFinalDeputado,
  referenciaEpoch: number,
): JanelaComparativoSemCobertura {
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
): JanelaComparativoSemCobertura {
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
      input.intervalosExercicio,
      legislaturaEncontrada.inicioEpoch,
      Math.min(fimJanelaEpoch, referenciaEpoch),
    ),
  };
}
