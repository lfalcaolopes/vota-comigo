import { toComparativoCota } from '@/comparativo-deputados/mappers/comparativo-cota.mapper';
import { deriveCoberturaCotaAte } from '@/comparativo-deputados/rules/cobertura-janela';
import {
  deriveAnosDaJanela,
  deriveJanelaComparativo,
  type LegislaturaPeriodo,
} from '@/comparativo-deputados/rules/janela-comparativo';
import type { DeputadoCotaJanelaSource } from '@/deputados/types/deputados.types';
import type { IntervaloExercicio } from '@/exercicio/types/exercicio.types';

import type {
  IngestionStep,
  IngestionStepContext,
  StepRunResult,
} from '../../types/ingestion-pipeline-runner.types';

import type {
  CoberturaAnualRow,
  DeputadoCotaComparacaoRepository,
  DeputadoCotaComparacaoRow,
  DeputadoJanelaRow,
  GastoCotaRow,
  MedianaUfRow,
} from './deputado-cota-comparacao.repository.types';

// Os gastos de um deputado ocupam poucas linhas, mas as de todos eles somam
// vários anos de jsonb; o lote mantém a memória plana sem voltar ao banco uma
// vez por deputado.
const TAMANHO_DO_LOTE = 200;

type DeputadoContexto = {
  coberturaByYear: ReadonlyMap<number, CoberturaAnualRow>;
  datasInicioLegislatura: readonly string[];
  gastosByDeputadoId: ReadonlyMap<string, readonly GastoCotaRow[]>;
  intervalosByDeputadoId: ReadonlyMap<string, readonly IntervaloExercicio[]>;
  legislaturas: readonly LegislaturaPeriodo[];
  medianaByUfYear: ReadonlyMap<string, MedianaUfRow>;
  referencia: string;
};

export function createDeputadoCotaComparacaoStep(
  repository: DeputadoCotaComparacaoRepository,
  now: () => Date = () => new Date(),
): IngestionStep {
  return {
    name: 'deputado_cota_comparacao',
    scope: 'single',
    source: 'derived',
    async run(context: IngestionStepContext): Promise<StepRunResult> {
      const intervalosByDeputadoId =
        await repository.loadIntervalosByDeputadoId();

      // Sem intervalos ninguém tem janela, e sem medianas ninguém tem contra o
      // que ser comparado; gravar isso apagaria comparações boas por conta de
      // uma fonte ainda não carregada.
      if (intervalosByDeputadoId.size === 0) {
        context.reporter?.log(
          '[deputado_cota_comparacao] intervalos de exercício ausentes, comparações não calculadas',
        );
        return emptyResult();
      }

      const medianas = await repository.loadMedianas();
      if (medianas.length === 0) {
        context.reporter?.log(
          '[deputado_cota_comparacao] medianas por UF ausentes, comparações não calculadas',
        );
        return emptyResult();
      }

      const [coberturas, deputados, legislaturas] = await Promise.all([
        repository.loadCoberturas(),
        repository.loadDeputados(),
        repository.loadLegislaturas(),
      ]);

      const referencia = now().toISOString();
      const rows: DeputadoCotaComparacaoRow[] = [];
      let read = 0;

      for (const lote of toLotes(deputados)) {
        const gastos = await repository.loadGastos(
          lote.map((deputado) => deputado.deputadoId),
        );
        const contexto: DeputadoContexto = {
          coberturaByYear: new Map(
            coberturas.map((cobertura) => [cobertura.year, cobertura]),
          ),
          datasInicioLegislatura: legislaturas.map(
            (periodo) => periodo.dataInicio,
          ),
          gastosByDeputadoId: groupByDeputadoId(gastos),
          intervalosByDeputadoId,
          legislaturas,
          medianaByUfYear: new Map(
            medianas.map((mediana) => [
              toUfYearKey(mediana.siglaUf, mediana.year),
              mediana,
            ]),
          ),
          referencia,
        };

        for (const deputado of lote) {
          read += 1;
          const row = toRow(deputado, contexto);
          if (row !== null) {
            rows.push(row);
          }
        }
      }

      context.reporter?.log(
        `[deputado_cota_comparacao] ${rows.length} comparação(ões) a partir de ${read} deputado(s)`,
      );

      if (context.dryRun) {
        return { ...emptyResult(), read };
      }

      const { inserted } = await repository.replaceAll(rows);

      return { ...emptyResult(), read, inserted };
    },
  };
}

function toRow(
  deputado: DeputadoJanelaRow,
  contexto: DeputadoContexto,
): DeputadoCotaComparacaoRow | null {
  const intervalosExercicio =
    contexto.intervalosByDeputadoId.get(deputado.deputadoId) ?? [];

  const janela = deriveJanelaComparativo({
    intervalosExercicio,
    legislaturas: contexto.legislaturas,
    legislaturaFinal: {
      legislatura: deputado.legislaturaFinal,
      periodo: deputado.legislaturaFinalPeriodo,
    },
    referencia: contexto.referencia,
  });

  // Quem não tem janela não tem posição em relação à mediana, e uma linha sem
  // posição só faria o feed filtrar sobre um valor que não existe.
  if (janela.status !== 'disponivel') {
    return null;
  }

  const years = deriveAnosDaJanela(
    janela.dataInicio,
    janela.dataFim,
    contexto.referencia,
  );
  const gastos = (
    contexto.gastosByDeputadoId.get(deputado.deputadoId) ?? []
  ).filter((gasto) => years.includes(gasto.year));

  const source = toCotaJanelaSource(
    gastos,
    years,
    intervalosExercicio,
    contexto,
  );
  const coberturaAte = deriveCoberturaCotaAte({
    dataInicioJanela: janela.dataInicio,
    dataFimJanela: janela.dataFim,
    coberturaCotaMensal: source.anos.flatMap((ano) =>
      ano.coveredThroughMonth === null
        ? []
        : [{ year: ano.year, coveredThroughMonth: ano.coveredThroughMonth }],
    ),
  });

  return {
    deputadoId: deputado.deputadoId,
    legislatura: janela.legislatura,
    referencia: contexto.referencia.slice(0, 10),
    cota: toComparativoCota({
      dataInicioJanela: janela.dataInicio,
      dataFimJanela: janela.dataFim,
      coberturaAte,
      source,
    }),
  };
}

function toCotaJanelaSource(
  gastos: readonly GastoCotaRow[],
  years: readonly number[],
  intervalosExercicio: readonly IntervaloExercicio[],
  contexto: DeputadoContexto,
): DeputadoCotaJanelaSource {
  // A UF do ano mais recente da janela, não a do snapshot: o snapshot é o
  // estado de hoje e atribuiria a UF atual a uma janela antiga.
  const siglaUf =
    [...gastos].sort((a, b) => b.year - a.year)[0]?.siglaUf ?? null;

  return {
    siglaUf,
    anos: years.map((year) => {
      const cobertura = contexto.coberturaByYear.get(year);
      const gasto = gastos.find((row) => row.year === year);
      const mediana =
        siglaUf === null
          ? undefined
          : contexto.medianaByUfYear.get(toUfYearKey(siglaUf, year));

      return {
        year,
        coveredThroughMonth: cobertura?.coveredThroughMonth ?? null,
        gastosJson: gasto?.gastosJson ?? null,
        sigepaReposto: cobertura?.sigepaReposto ?? false,
        sigepaCoveredThroughMonth: cobertura?.sigepaCoveredThroughMonth ?? null,
        gastosSigepaJson: gasto?.gastosSigepaJson ?? null,
        medianaUf:
          mediana === undefined
            ? null
            : {
                amountUsedCents: mediana.amountUsedCents,
                deputadoCount: mediana.deputadoCount,
              },
      };
    }),
    intervalosExercicio,
    datasInicioLegislatura: contexto.datasInicioLegislatura,
  };
}

function toUfYearKey(siglaUf: string, year: number): string {
  return `${siglaUf}:${year}`;
}

function groupByDeputadoId(
  gastos: readonly GastoCotaRow[],
): ReadonlyMap<string, readonly GastoCotaRow[]> {
  const gastosByDeputadoId = new Map<string, GastoCotaRow[]>();

  for (const gasto of gastos) {
    const existing = gastosByDeputadoId.get(gasto.deputadoId);
    if (existing === undefined) {
      gastosByDeputadoId.set(gasto.deputadoId, [gasto]);
    } else {
      existing.push(gasto);
    }
  }

  return gastosByDeputadoId;
}

function toLotes(
  deputados: readonly DeputadoJanelaRow[],
): readonly (readonly DeputadoJanelaRow[])[] {
  return Array.from(
    { length: Math.ceil(deputados.length / TAMANHO_DO_LOTE) },
    (_, index) =>
      deputados.slice(index * TAMANHO_DO_LOTE, (index + 1) * TAMANHO_DO_LOTE),
  );
}

function emptyResult(): StepRunResult {
  return {
    read: 0,
    inserted: 0,
    updated: 0,
    ignored: 0,
    rejected: [],
    externalGaps: [],
  };
}
