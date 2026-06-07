import type {
  IngestionStep,
  IngestionStepContext,
  StepRunResult,
} from '../../ingestion-runner.types';
import type { FonteDerivadaProposicoesAfetadas } from './fonte-derivada-proposicoes-afetadas';
import { toProposicaoRow } from './proposicoes.transformer';
import type {
  ProposicaoRepository,
  ProposicaoRow,
} from './proposicoes.repository.types';

export type ProposicoesStepDeps = {
  repository: ProposicaoRepository;
  fonteDerivada: FonteDerivadaProposicoesAfetadas;
};

export function createProposicoesStep(
  deps: ProposicoesStepDeps,
): IngestionStep {
  return {
    name: 'proposicoes',
    scope: 'single',
    source: 'derived',
    async run(context: IngestionStepContext): Promise<StepRunResult> {
      const readDataset = context.readDataset;

      if (readDataset === undefined) {
        throw new Error(
          'Passo proposicoes requer readDataset no contexto de execução.',
        );
      }

      const prepared = await deps.fonteDerivada.prepareProposicoes({
        years: context.years ?? [],
        limit: context.limit,
        canDownload: !context.dryRun,
        strict: context.strict,
        reporter: context.reporter,
        readDataset,
      });

      const rows: ProposicaoRow[] = [];
      let read = 0;

      for (const [year, neededIds] of prepared.neededByYear) {
        const yearSource = readDataset('proposicoes', year);

        if (yearSource === undefined) {
          continue;
        }

        context.reporter?.log(`[proposicoes] lendo proposicoes-${year}.csv`);

        for await (const { record } of yearSource()) {
          const externalId = Number(record.id);

          if (!neededIds.has(externalId)) {
            continue;
          }

          rows.push(toProposicaoRow(record));
          read += 1;
        }
      }

      const { inserted, updated } = context.dryRun
        ? { inserted: 0, updated: 0 }
        : await deps.repository.upsert(rows);

      return {
        read,
        inserted,
        updated,
        ignored: 0,
        rejected: [],
        externalGaps: [...prepared.externalGaps],
      };
    },
  };
}
