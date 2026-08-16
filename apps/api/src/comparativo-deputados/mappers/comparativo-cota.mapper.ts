import type {
  ComparativoCota,
  ComparativoCotaAno,
} from '@vota-comigo/shared-types';

import { somarGastosAteMes } from '@/deputados/mappers/deputado-ceap.mapper';
import type { DeputadoCotaJanelaSource } from '@/deputados/types/deputados.types';
import {
  clipIntervalosExercicio,
  deriveJanelaExercicioAno,
  somarDiasEmExercicio,
} from '@/exercicio/rules/exercicio-ano';
import { toEpochMillis } from '@/exercicio/rules/instante';
import { isAnoReposto } from '@/shared/cota/ano-reposto';
import {
  deriveTetoAnualCota,
  type TetoAnualCotaApuracao,
} from '@/shared/cota/teto-anual-cota';
import {
  applyReposicaoSigepa,
  deriveSigepaDataStatus,
} from '@/shared/cota/reposicao-sigepa';

const DIA_EM_MILLIS = 24 * 60 * 60 * 1000;

type ComparativoCotaInput = {
  dataInicioJanela: string;
  dataFimJanela: string;
  coberturaAte: string;
  source: DeputadoCotaJanelaSource;
};

type AnoComSomas = {
  ano: ComparativoCotaAno;
  gastoCents: number;
  medianaCents: number;
  teto: TetoAnualCotaApuracao;
};

export function toComparativoCota(
  input: ComparativoCotaInput,
): ComparativoCota {
  const anosComSomas = input.source.anos
    .filter((ano) => ano.year <= Number(input.coberturaAte.slice(0, 4)))
    .map((ano) => toAnoComSomas(ano, input))
    .sort((a, b) => a.ano.year - b.ano.year);
  const anos = anosComSomas.map((item) => item.ano);

  if (input.source.siglaUf === null) {
    return { status: 'sem-comparacao', motivo: 'sem-gastos', anos };
  }

  const naComparacao = anosComSomas.filter((item) => item.ano.naComparacao);
  const somaMedianaCents = naComparacao.reduce(
    (total, item) => total + item.medianaCents,
    0,
  );

  if (naComparacao.length === 0 || somaMedianaCents <= 0) {
    return { status: 'sem-comparacao', motivo: 'sem-mediana-na-janela', anos };
  }

  const somaGastoCents = naComparacao.reduce(
    (total, item) => total + item.gastoCents,
    0,
  );

  return {
    status: 'comparavel',
    percentualSobreMedianaUf: (somaGastoCents / somaMedianaCents) * 100,
    gastoNaComparacaoCents: somaGastoCents,
    medianaNaComparacaoCents: somaMedianaCents,
    tetoNaComparacaoCents: somarTetoNaComparacao(naComparacao),
    siglaUf: input.source.siglaUf,
    anos,
    anosNaComparacao: naComparacao.length,
    diasEmExercicio: naComparacao.reduce(
      (total, item) => total + item.ano.diasEmExercicio,
      0,
    ),
    diasNaComparacao: naComparacao.reduce(
      (total, item) => total + item.ano.diasNoAno,
      0,
    ),
  };
}

// Um ano sem exercício contribui zero, mas basta um ano sem tabela publicada
// para que a régua da janela inteira deixe de ser afirmável.
function somarTetoNaComparacao(
  naComparacao: readonly AnoComSomas[],
): number | null {
  if (naComparacao.some((item) => item.teto.status === 'sem-tabela')) {
    return null;
  }

  const soma = naComparacao.reduce(
    (total, item) =>
      total + (item.teto.status === 'apurado' ? item.teto.amountCents : 0),
    0,
  );

  return soma > 0 ? soma : null;
}

function toAnoComSomas(
  ano: DeputadoCotaJanelaSource['anos'][number],
  input: ComparativoCotaInput,
): AnoComSomas {
  const janelaAno = deriveJanelaExercicioAno(
    ano.year,
    input.source.datasInicioLegislatura,
  );
  const inicioEpoch = Math.max(
    toEpochMillis(janelaAno.inicio) ?? 0,
    toEpochMillis(input.dataInicioJanela) ?? 0,
  );
  const fimEpoch = Math.min(
    toEpochMillis(janelaAno.fim) ?? 0,
    toEpochMillis(input.dataFimJanela) ?? 0,
    // coberturaAte é o último dia coberto, inclusive.
    (toEpochMillis(input.coberturaAte) ?? 0) + DIA_EM_MILLIS,
  );

  const diasNoAno = Math.max(
    0,
    Math.round((fimEpoch - inicioEpoch) / DIA_EM_MILLIS),
  );
  const diasEmExercicio = somarDiasEmExercicio(
    input.source.intervalosExercicio,
    inicioEpoch,
    fimEpoch,
  );

  // Sem mediana o ano não tem contra o que ser comparado; um ano sem gasto
  // nenhum entra com numerador zero, e diasEmExercicio explica o porquê.
  const medianaUf =
    ano.medianaUf !== null &&
    ano.medianaUf.amountUsedCents > 0 &&
    ano.medianaUf.deputadoCount > 0
      ? ano.medianaUf
      : null;
  const naComparacao = medianaUf !== null;
  const anoReposto =
    ano.coveredThroughMonth !== null &&
    isAnoReposto({
      sigepaReposto: ano.sigepaReposto,
      sigepaCoveredThroughMonth: ano.sigepaCoveredThroughMonth,
      coveredThroughMonth: ano.coveredThroughMonth,
    });
  const gastosJson = applyReposicaoSigepa({
    year: ano.year,
    anoReposto,
    gastosJson: ano.gastosJson,
    gastosSigepaJson: ano.gastosSigepaJson,
  });
  const gastoCents = somarGastosAteMes(
    gastosJson ?? {},
    ano.coveredThroughMonth ?? 0,
  );
  const medianaCents = medianaUf?.amountUsedCents ?? 0;

  // O teto acompanha o gasto pela cauda — não conta meses ainda descobertos —,
  // mas abre no ano civil, e não no início da janela: quem vinha da legislatura
  // anterior tem direito em janeiro do ano de posse, e o gasto dele entra.
  const teto = deriveTetoAnualCota(
    input.source.siglaUf,
    ano.year,
    clipIntervalosExercicio(
      input.source.intervalosExercicio,
      Date.UTC(ano.year, 0, 1),
      fimEpoch,
    ),
  );

  return {
    ano: {
      year: ano.year,
      naComparacao,
      percentualSobreMedianaUf:
        medianaUf === null ? null : (gastoCents / medianaCents) * 100,
      diasEmExercicio,
      diasNoAno,
      medianaUfDeputadoCount: medianaUf?.deputadoCount ?? null,
      dadoIncompleto:
        deriveSigepaDataStatus({
          year: ano.year,
          coveredThroughMonth: ano.coveredThroughMonth ?? 0,
          anoReposto,
        }) === 'incompleto',
    },
    gastoCents,
    medianaCents,
    teto,
  };
}
