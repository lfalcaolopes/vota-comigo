import { toEpochMillis } from '../../exercicio/rules/instante';

const DIA_EM_MILLIS = 24 * 60 * 60 * 1000;

export type CoberturaCotaAno = { year: number; coveredThroughMonth: number };

export type DeriveCoberturaCotaInput = {
  dataInicioJanela: string;
  dataFimJanela: string;
  coberturaCotaMensal: readonly CoberturaCotaAno[];
};

export type DeriveCoberturaJanelaInput = DeriveCoberturaCotaInput & {
  coveredThroughDateAssinaturas: string | null;
};

export type CoberturaJanela = {
  coberturaAte: string;
  divisorAnosEfetivos: number;
};

function getYear(iso: string): number {
  return Number(iso.slice(0, 4));
}

function toDateOnly(epoch: number): string {
  return new Date(epoch).toISOString().slice(0, 10);
}

function ultimoDiaDoAno(year: number): number {
  return Date.UTC(year, 11, 31);
}

function ultimoDiaDoMes(year: number, month: number): number {
  return Date.UTC(year, month, 0);
}

function diasNoAno(year: number): number {
  return (Date.UTC(year + 1, 0, 1) - Date.UTC(year, 0, 1)) / DIA_EM_MILLIS;
}

// "Coberto até" é sempre o último dia efetivamente coberto (inclusive), não
// um limite exclusivo: um buraco em Y faz a cobertura da cota parar no fim
// do último ano plenamente coberto, Y-1, em vez de "início de Y" — as duas
// formas seriam equivalentes em dias cobertos, mas só a primeira mantém o
// mesmo significado de "coberto até" usado nos demais ramos da função.
function deriveCotaCoberturaAte(
  anoInicio: number,
  anoFim: number,
  coberturaCotaMensal: readonly CoberturaCotaAno[],
): number {
  let coberturaAteEpoch = ultimoDiaDoAno(anoInicio - 1);

  for (let year = anoInicio; year <= anoFim; year += 1) {
    const entrada = coberturaCotaMensal.find((item) => item.year === year);
    if (entrada === undefined) {
      return coberturaAteEpoch;
    }

    if (entrada.coveredThroughMonth >= 12) {
      coberturaAteEpoch = ultimoDiaDoAno(year);
      continue;
    }

    return ultimoDiaDoMes(year, entrada.coveredThroughMonth);
  }

  return coberturaAteEpoch;
}

// A comparação de gasto de cota só pode ser cortada pelo que a própria fonte da
// cota cobre: encurtá-la porque outra ingestão ficou para trás moveria o
// denominador por um motivo sem relação nenhuma com gasto.
export function deriveCoberturaCotaAte(
  input: DeriveCoberturaCotaInput,
): string {
  return toDateOnly(
    deriveCotaCoberturaAte(
      getYear(input.dataInicioJanela),
      getYear(input.dataFimJanela),
      input.coberturaCotaMensal,
    ),
  );
}

export function deriveCoberturaJanela(
  input: DeriveCoberturaJanelaInput,
): CoberturaJanela {
  const anoInicio = getYear(input.dataInicioJanela);
  const anoFim = getYear(input.dataFimJanela);

  const cotaCoberturaAteEpoch = deriveCotaCoberturaAte(
    anoInicio,
    anoFim,
    input.coberturaCotaMensal,
  );

  const assinaturasCoberturaAteEpoch =
    input.coveredThroughDateAssinaturas === null
      ? Number.POSITIVE_INFINITY
      : (toEpochMillis(input.coveredThroughDateAssinaturas) ??
        Number.POSITIVE_INFINITY);

  const coberturaAteEpoch = Math.min(
    cotaCoberturaAteEpoch,
    assinaturasCoberturaAteEpoch,
  );

  const coberturaAno = new Date(coberturaAteEpoch).getUTCFullYear();
  const ordinalDoAno =
    (coberturaAteEpoch - Date.UTC(coberturaAno, 0, 1)) / DIA_EM_MILLIS + 1;
  const fracaoDoAno = ordinalDoAno / diasNoAno(coberturaAno);

  const anosFechados = coberturaAno - anoInicio;
  const divisorAnosEfetivos = Math.max(0, anosFechados + fracaoDoAno);

  return {
    coberturaAte: toDateOnly(coberturaAteEpoch),
    divisorAnosEfetivos,
  };
}
