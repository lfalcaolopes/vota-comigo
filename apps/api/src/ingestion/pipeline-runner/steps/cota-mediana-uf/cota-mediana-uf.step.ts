import { deriveJanelaExercicioAno } from '@/exercicio/rules/exercicio-ano';
import { isAnoReposto } from '@/shared/cota/ano-reposto';
import {
  applyReposicaoSigepa,
  deriveSigepaDataStatus,
} from '@/shared/cota/reposicao-sigepa';

import { sumGastoCotaAno } from '../deputado-gasto-cota/gasto-cota-ano';
import type {
  IngestionStep,
  IngestionStepContext,
  StepRunResult,
} from '../../types/ingestion-pipeline-runner.types';

import { deriveCotaMedianaUf } from './mediana-uf';
import type { CotaMedianaUfRepository } from './cota-mediana-uf.repository.types';

export function createCotaMedianaUfStep(
  repository: CotaMedianaUfRepository,
): IngestionStep {
  return {
    name: 'cota_mediana_uf',
    scope: 'single',
    source: 'derived',
    async run(context: IngestionStepContext): Promise<StepRunResult> {
      const intervalosByDeputadoId =
        await repository.loadIntervalosByDeputadoId();

      // Sem intervalos ninguém é elegível, e gravar isso apagaria medianas
      // boas por conta de um histórico ainda não carregado.
      if (intervalosByDeputadoId.size === 0) {
        context.reporter?.log(
          '[cota_mediana_uf] intervalos de exercício ausentes, medianas não calculadas',
        );
        return emptyResult();
      }

      const coberturas = await repository.loadCoberturas();
      const datasInicioLegislatura =
        await repository.loadDatasInicioLegislatura();
      let read = 0;
      let inserted = 0;

      for (const cobertura of coberturas) {
        const year = cobertura.year;
        const anoReposto = isAnoReposto(cobertura);

        // Ano da janela ainda não reposto não recebe mediana publicada: a
        // lacuna encolhe o gasto de cada deputado em proporção diferente, e uma
        // mediana igualmente encolhida faria quem mais voa parecer quem menos
        // gasta (ADR 022).
        if (
          deriveSigepaDataStatus({
            year,
            coveredThroughMonth: cobertura.coveredThroughMonth,
            anoReposto,
          }) === 'incompleto'
        ) {
          context.reporter?.log(
            `[cota_mediana_uf] ${year}: fonte incompleta, mediana não publicada`,
          );
          if (!context.dryRun) {
            await repository.replaceAno(year, []);
          }
          continue;
        }

        const gastos = await repository.loadGastosAnuais(year);
        read += gastos.length;

        const medianas = deriveCotaMedianaUf({
          year,
          janela: deriveJanelaExercicioAno(year, datasInicioLegislatura),
          gastos: gastos.map((gasto) => ({
            deputadoId: gasto.deputadoId,
            siglaUf: gasto.siglaUf,
            valorUtilizadoCentavos: sumGastoCotaAno(
              applyReposicaoSigepa({
                year,
                anoReposto,
                gastosJson: gasto.gastosJson,
                gastosSigepaJson: gasto.gastosSigepaJson,
              }) ?? {},
            ),
            intervalos: intervalosByDeputadoId.get(gasto.deputadoId) ?? [],
          })),
        });

        context.reporter?.log(
          `[cota_mediana_uf] ${year}: ${medianas.length} UF(s) a partir de ${gastos.length} deputado(s)`,
        );

        if (!context.dryRun) {
          const replaced = await repository.replaceAno(year, medianas);
          inserted += replaced.inserted;
        }
      }

      return { ...emptyResult(), read, inserted };
    },
  };
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
