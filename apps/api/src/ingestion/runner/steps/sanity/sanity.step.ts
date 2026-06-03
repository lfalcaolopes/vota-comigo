import type {
  ExternalGap,
  IngestionStep,
  IngestionStepContext,
  Rejection,
  StepRunResult,
} from '../../ingestion-runner.types';
import { StrictModeError } from '../../strict-mode-error';
import {
  comparePlacar,
  type PlacarDivergence,
  type PlacarSemVotos,
} from './sanity.checker';
import type {
  PlacarComparisonRow,
  SanityRepository,
} from './sanity.repository.types';

export const SANITY_PLACAR_DIVERGENTE = 'sanity_placar_divergente';
export const SANITY_VOTOS_AUSENTES = 'votos_individuais_ausentes';

export function createSanityStep(repository: SanityRepository): IngestionStep {
  return {
    name: 'sanity',
    scope: 'single',
    source: 'db',
    async run(context: IngestionStepContext): Promise<StepRunResult> {
      // Sem escrita no banco não há placar fresco para validar.
      if (context.dryRun) {
        return emptyResult();
      }

      const placares = await repository.loadPlacares();
      context.reporter?.log(
        `[sanity] comparando placar de ${placares.length} votações`,
      );

      const rejected: Rejection[] = [];
      const externalGaps: ExternalGap[] = [];
      let ignored = 0;

      for (const row of placares) {
        const comparison = comparePlacar(row);

        if (comparison.status === 'incomparavel') {
          ignored += 1;
          continue;
        }

        if (comparison.status === 'votos_ausentes') {
          const gap = toGap(comparison.semVotos);

          if (context.strict) {
            throw StrictModeError.fromGap(gap);
          }

          externalGaps.push(gap);
          continue;
        }

        if (comparison.status === 'divergente') {
          const rejection = toRejection(comparison.divergence);

          if (context.strict) {
            throw new StrictModeError(rejection);
          }

          rejected.push(rejection);
          reportOutrosBreakdown(context, row);
        }
      }

      if (rejected.length > 0) {
        context.reporter?.log(
          `[sanity] ${rejected.length} divergência(s) de placar`,
        );
      }

      if (externalGaps.length > 0) {
        context.reporter?.log(
          `[sanity] ${externalGaps.length} votação(ões) sem voto individual na fonte`,
        );
      }

      return {
        read: placares.length,
        inserted: 0,
        updated: 0,
        ignored,
        rejected,
        externalGaps,
      };
    },
  };
}

function toRejection(divergence: PlacarDivergence): Rejection {
  return {
    file: 'sanity',
    line: 0,
    type: SANITY_PLACAR_DIVERGENTE,
    fields: {
      externalIdVotacao: divergence.externalIdVotacao,
      votosSimOficial: String(divergence.votosSimOficial),
      votosSimDerivado: String(divergence.votosSimDerivado),
      votosNaoOficial: String(divergence.votosNaoOficial),
      votosNaoDerivado: String(divergence.votosNaoDerivado),
    },
    message: `Placar divergente na votação ${divergence.externalIdVotacao}: sim oficial ${divergence.votosSimOficial} × derivado ${divergence.votosSimDerivado}, não oficial ${divergence.votosNaoOficial} × derivado ${divergence.votosNaoDerivado}.`,
  };
}

function toGap(semVotos: PlacarSemVotos): ExternalGap {
  return {
    file: 'sanity',
    type: SANITY_VOTOS_AUSENTES,
    reference: semVotos.externalIdVotacao,
    message:
      `Votação ${semVotos.externalIdVotacao}: placar oficial ` +
      `(sim ${semVotos.votosSimOficial}, não ${semVotos.votosNaoOficial}) ` +
      `sem direção de voto individual na fonte; ${semVotos.votosNaoInformadoDerivado} ` +
      `votos vieram em branco (nao_informado). Lacuna da fonte, sem registro sintético.`,
  };
}

function reportOutrosBreakdown(
  context: IngestionStepContext,
  row: PlacarComparisonRow,
): void {
  const reporter = context.reporter;

  if (!context.debug || reporter?.debug === undefined) {
    return;
  }

  const { abstencao, obstrucao, artigo17, naoInformado } = row.outrosDerivado;
  reporter.debug(
    `[debug] [sanity] ${row.externalIdVotacao} outros derivados: abstenção ${abstencao}, obstrução ${obstrucao}, artigo 17 ${artigo17}, não informado ${naoInformado}`,
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
