import { isAnoReposto } from '@/shared/cota/ano-reposto';
import {
  deriveMesesCobertos,
  enumerateMeses,
  lastDayOfMonth,
  type MesCota,
} from '@/shared/cota/mes-cota';
import { deriveSigepaDataStatus } from '@/shared/cota/reposicao-sigepa';
import type {
  UsoCotaCobertura,
  UsoCotaLegislatura,
} from '@/shared/cota/uso-cota';

export type JanelaCotaLegislatura = {
  readonly mesesCobertos: readonly MesCota[];
  readonly coberturaAte: string;
};

export type DeriveJanelaCotaLegislaturaInput = {
  readonly legislatura: UsoCotaLegislatura;
  readonly coberturas: readonly UsoCotaCobertura[];
  readonly referencia: string;
};

export function deriveJanelaCotaLegislatura(
  input: DeriveJanelaCotaLegislaturaInput,
): JanelaCotaLegislatura | null {
  const mesesDaJanela = enumerateMeses(
    input.legislatura.dataInicio,
    minDate(input.legislatura.dataFim, input.referencia),
  );
  const { meses, contigua } = deriveMesesCobertos({
    mesesDaJanela,
    coberturas: input.coberturas,
  });
  if (!contigua) {
    return null;
  }

  const mesesCobertos = truncateNaLacunaSigepa(meses, input.coberturas);
  const ultimoMes = mesesCobertos.at(-1);
  if (ultimoMes === undefined) {
    return null;
  }

  return { mesesCobertos, coberturaAte: lastDayOfMonth(ultimoMes) };
}

// Um ano ainda não reposto perdeu a passagem aérea do dump sem ganhar a da
// reposição: somá-lo devolveria um total menor sem dizer que é menor. A janela
// encerra antes da lacuna e a cobertura declarada encolhe junto (ADR 022).
function truncateNaLacunaSigepa(
  meses: readonly MesCota[],
  coberturas: readonly UsoCotaCobertura[],
): readonly MesCota[] {
  const coberturaByYear = new Map(coberturas.map((item) => [item.year, item]));
  const lacuna = meses.findIndex((mes) => {
    const cobertura = coberturaByYear.get(mes.year);
    return (
      cobertura !== undefined &&
      deriveSigepaDataStatus({
        year: mes.year,
        coveredThroughMonth: mes.month,
        anoReposto: isAnoReposto(cobertura),
      }) === 'incompleto'
    );
  });

  return lacuna === -1 ? meses : meses.slice(0, lacuna);
}

function minDate(a: string, b: string): string {
  return a < b ? a : b;
}
