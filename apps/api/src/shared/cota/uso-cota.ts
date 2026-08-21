import type {
  UsoCotaIndisponivelMotivo,
  UsoCotaResumo,
} from '@vota-comigo/shared-types';

import type { IntervaloExercicio } from '@/exercicio/types/exercicio.types';
import { somarDiasEmExercicio } from '@/exercicio/rules/exercicio-ano';

import type { CoberturaCotaSigepa } from './ano-reposto';
import { isAnoReposto } from './ano-reposto';
import { limiteMensalCota } from './limite-mensal-cota';
import {
  deriveMesesCobertos,
  enumerateMeses,
  firstDayOfMonth,
  lastDayOfMonth,
} from './mes-cota';
import {
  applyReposicaoSigepa,
  deriveSigepaDataStatus,
  type GastosCotaJson,
  type GastosSigepaJson,
} from './reposicao-sigepa';

const DIA_EM_MILLIS = 24 * 60 * 60 * 1000;

export type UsoCotaLegislatura = {
  legislatura: number;
  dataInicio: string;
  dataFim: string;
};

export type UsoCotaCobertura = CoberturaCotaSigepa & { year: number };

export type UsoCotaGasto = {
  year: number;
  gastosJson: GastosCotaJson | null;
  gastosSigepaJson: GastosSigepaJson | null;
};

export type UsoCotaUfPeriodo = {
  dataInicio: string;
  dataFim: string | null;
  siglaUf: string | null;
};

export type UsoCotaApuracao = UsoCotaResumo & {
  gastoCents: number | null;
  tetoBaseCents: number | null;
  coberturaAte: string | null;
  periodStart: string | null;
  diasEmExercicio: number | null;
};

export type DeriveUsoCotaInput = {
  externalIdDeputado: number;
  intervalosExercicio: readonly IntervaloExercicio[];
  legislaturas: readonly UsoCotaLegislatura[];
  coberturas: readonly UsoCotaCobertura[];
  gastos: readonly UsoCotaGasto[];
  ufs: readonly UsoCotaUfPeriodo[];
  referencia: string;
};

export function deriveUsoCota(input: DeriveUsoCotaInput): UsoCotaApuracao {
  if (input.intervalosExercicio.length === 0) {
    return indisponivel('intervalo-exercicio-ausente', null);
  }
  if (input.intervalosExercicio.some(isIntervaloInconsistente)) {
    return indisponivel('intervalo-exercicio-inconsistente', null);
  }

  const legislatura = [...input.legislaturas]
    .filter((item) =>
      input.intervalosExercicio.some((intervalo) =>
        intersects(
          intervalo.openedAt,
          minNullableDate(intervalo.closedAt, input.referencia),
          item.dataInicio,
          item.dataFim,
        ),
      ),
    )
    .sort((a, b) => b.legislatura - a.legislatura)[0];

  if (legislatura === undefined) {
    return indisponivel('sem-legislatura-com-exercicio', null);
  }

  const coberturaByYear = new Map(
    input.coberturas.map((item) => [item.year, item]),
  );
  const primeiroAnoCoberto = Math.min(...coberturaByYear.keys());
  if (!Number.isFinite(primeiroAnoCoberto)) {
    return indisponivel('fonte-incompleta', legislatura.legislatura);
  }
  if (Number(legislatura.dataFim.slice(0, 4)) < primeiroAnoCoberto) {
    return indisponivel(
      'legislatura-anterior-a-cobertura',
      legislatura.legislatura,
    );
  }

  const mesesDaJanela = enumerateMeses(
    legislatura.dataInicio,
    minDate(legislatura.dataFim, input.referencia),
  );
  const { meses: mesesCobertos, contigua } = deriveMesesCobertos({
    mesesDaJanela,
    coberturas: input.coberturas,
  });
  if (!contigua || mesesCobertos.length === 0) {
    return indisponivel('fonte-incompleta', legislatura.legislatura);
  }

  const legislaturaEncerrada = legislatura.dataFim < input.referencia;
  if (legislaturaEncerrada && mesesCobertos.length !== mesesDaJanela.length) {
    return indisponivel('fonte-incompleta', legislatura.legislatura);
  }

  const ultimoMes = mesesCobertos.at(-1)!;
  const coberturaAte = lastDayOfMonth(ultimoMes);
  const anosUsados = new Set(mesesCobertos.map((mes) => mes.year));
  for (const year of anosUsados) {
    const cobertura = coberturaByYear.get(year)!;
    if (
      deriveSigepaDataStatus({
        year,
        coveredThroughMonth: Math.min(
          cobertura.coveredThroughMonth,
          year === ultimoMes.year ? ultimoMes.month : 12,
        ),
        anoReposto: isAnoReposto(cobertura),
      }) === 'incompleto'
    ) {
      return indisponivel('sigepa-incompleto', legislatura.legislatura);
    }
  }

  const gastosByYear = new Map(input.gastos.map((item) => [item.year, item]));
  let gastoCents = 0;
  for (const year of anosUsados) {
    const gasto = gastosByYear.get(year);
    const cobertura = coberturaByYear.get(year)!;
    const gastosJson = applyReposicaoSigepa({
      year,
      anoReposto: isAnoReposto(cobertura),
      gastosJson: gasto?.gastosJson ?? null,
      gastosSigepaJson: gasto?.gastosSigepaJson ?? null,
    });
    for (const mes of mesesCobertos.filter((item) => item.year === year)) {
      gastoCents += Object.values(gastosJson?.[String(mes.month)] ?? {}).reduce(
        (total, valor) => total + valor,
        0,
      );
    }
  }

  const mesesComDireito = mesesCobertos.filter((mes) =>
    input.intervalosExercicio.some((intervalo) =>
      intersects(
        intervalo.openedAt,
        intervalo.closedAt,
        firstDayOfMonth(mes),
        lastDayOfMonth(mes),
      ),
    ),
  );
  if (mesesComDireito.length === 0) {
    return indisponivel('intervalo-exercicio-ausente', legislatura.legislatura);
  }

  let tetoBaseCents = 0;
  for (const mes of mesesComDireito) {
    const mesInicio = firstDayOfMonth(mes);
    const mesFim = lastDayOfMonth(mes);
    const ufs = new Set(
      input.ufs
        .filter(
          (periodo) =>
            periodo.siglaUf !== null &&
            intersects(
              periodo.dataInicio,
              periodo.dataFim,
              mesInicio,
              mesFim,
            ) &&
            input.intervalosExercicio.some((intervalo) =>
              intersects(
                maxDate(periodo.dataInicio, intervalo.openedAt),
                minNullableDate(periodo.dataFim, intervalo.closedAt),
                mesInicio,
                mesFim,
              ),
            ),
        )
        .map((periodo) => periodo.siglaUf!),
    );
    if (ufs.size !== 1) {
      return indisponivel(
        'uf-ausente-ou-inconsistente',
        legislatura.legislatura,
      );
    }
    const limite = limiteMensalCota([...ufs][0], mesInicio);
    if (limite === null || limite <= 0) {
      return indisponivel('teto-base-ausente-ou-zero', legislatura.legislatura);
    }
    tetoBaseCents += limite;
  }

  if (tetoBaseCents <= 0) {
    return indisponivel('teto-base-ausente-ou-zero', legislatura.legislatura);
  }

  const periodStart = legislatura.dataInicio.slice(0, 10);
  const diasEmExercicio = somarDiasEmExercicio(
    input.intervalosExercicio,
    Date.parse(`${periodStart}T00:00:00Z`),
    Date.parse(`${coberturaAte}T00:00:00Z`) + DIA_EM_MILLIS,
  );

  return {
    status: 'calculavel',
    legislatura: legislatura.legislatura,
    percentualTetoBase: (100 * gastoCents) / tetoBaseCents,
    periodStart,
    diasEmExercicio,
    gastoCents,
    tetoBaseCents,
    coberturaAte,
  };
}

function indisponivel(
  motivo: UsoCotaIndisponivelMotivo,
  legislatura: number | null,
): UsoCotaApuracao {
  return {
    status: 'indisponivel',
    motivo,
    legislatura,
    gastoCents: null,
    tetoBaseCents: null,
    coberturaAte: null,
    periodStart: null,
    diasEmExercicio: null,
  };
}

function isIntervaloInconsistente(intervalo: IntervaloExercicio): boolean {
  return (
    !isDate(intervalo.openedAt) ||
    (intervalo.closedAt !== null &&
      (!isDate(intervalo.closedAt) || intervalo.closedAt < intervalo.openedAt))
  );
}

function intersects(
  inicioA: string,
  fimA: string | null,
  inicioB: string,
  fimB: string | null,
): boolean {
  return (
    inicioA.slice(0, 10) <= (fimB?.slice(0, 10) ?? '9999-12-31') &&
    inicioB.slice(0, 10) <= (fimA?.slice(0, 10) ?? '9999-12-31')
  );
}

function isDate(value: string): boolean {
  return !Number.isNaN(Date.parse(value));
}

function minDate(a: string, b: string): string {
  return a < b ? a : b;
}

function maxDate(a: string, b: string): string {
  return a > b ? a : b;
}

function minNullableDate(a: string | null, b: string | null): string | null {
  if (a === null) return b;
  if (b === null) return a;
  return minDate(a, b);
}
