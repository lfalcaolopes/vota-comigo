import type {
  IngestionStep,
  IngestionStepContext,
  StepRunResult,
} from '../../types/ingestion-pipeline-runner.types';
import { normalizeProposicaoTemaRecord } from '../../shared/proposicoes-temas.normalizer';
import type { FonteDerivadaProposicoesAfetadas } from '../proposicoes/fonte-derivada-proposicoes-afetadas';
import type { ProposicaoLookup } from '../votacao-proposicao/votacao-proposicao.repository.types';
import type {
  ProposicaoTemaRow,
  TemaLookup,
  TemaRepository,
  TemaRow,
} from './tema.repository.types';

const TEMA_DATASET = 'proposicoesTemas';

export type TemaStepDeps = {
  repository: TemaRepository;
  fonteDerivada: FonteDerivadaProposicoesAfetadas;
  proposicaoLookup: ProposicaoLookup;
  temaLookup: TemaLookup;
};

type PendingVinculo = {
  externalIdProposicao: number;
  externalCodTema: number;
  proposicaoId: string;
};

export function createTemaStep(deps: TemaStepDeps): IngestionStep {
  return {
    name: 'tema',
    scope: 'single',
    source: 'derived',
    async run(context: IngestionStepContext): Promise<StepRunResult> {
      const readDataset = context.readDataset;

      if (readDataset === undefined) {
        throw new Error(
          'Passo tema requer readDataset no contexto de execução.',
        );
      }

      const prepared = await deps.fonteDerivada.prepareTemas({
        years: context.years ?? [],
        limit: context.limit,
        canDownload: !context.dryRun,
        strict: context.strict,
        reporter: context.reporter,
        readDataset,
      });

      const proposicaoIds = await deps.proposicaoLookup.loadIdByExternalId();

      const temaByCod = new Map<number, TemaRow>();
      const vinculoKeys = new Set<string>();
      const pendingVinculos: PendingVinculo[] = [];
      let read = 0;
      let ignored = 0;

      for (const year of prepared.neededByYear.keys()) {
        const yearSource = readDataset(TEMA_DATASET, year);

        if (yearSource === undefined) {
          continue;
        }

        context.reporter?.log(`[tema] lendo ${TEMA_DATASET}-${year}.csv`);

        for await (const { record } of yearSource()) {
          const { externalIdProposicao, codTema, tema } =
            normalizeProposicaoTemaRecord(record);

          if (externalIdProposicao === null || codTema === null) {
            ignored += 1;
            continue;
          }

          const proposicaoId = proposicaoIds.get(externalIdProposicao);

          if (proposicaoId === undefined) {
            ignored += 1;
            continue;
          }

          if (!temaByCod.has(codTema)) {
            temaByCod.set(codTema, { externalCodTema: codTema, tema });
          }

          const key = `${externalIdProposicao}:${codTema}`;

          if (!vinculoKeys.has(key)) {
            vinculoKeys.add(key);
            pendingVinculos.push({
              externalIdProposicao,
              externalCodTema: codTema,
              proposicaoId,
            });
            read += 1;
          }
        }
      }

      if (context.dryRun) {
        return {
          read,
          inserted: 0,
          updated: 0,
          ignored,
          rejected: [],
          externalGaps: [...prepared.externalGaps],
        };
      }

      const temaResult = await deps.repository.upsertTemas([
        ...temaByCod.values(),
      ]);

      const temaIds = await deps.temaLookup.loadIdByExternalCodTema();
      const vinculoRows = resolveVinculos(pendingVinculos, temaIds);
      const vinculoResult = await deps.repository.upsertVinculos(vinculoRows);

      return {
        read,
        inserted: temaResult.inserted + vinculoResult.inserted,
        updated: temaResult.updated + vinculoResult.updated,
        ignored,
        rejected: [],
        externalGaps: [...prepared.externalGaps],
      };
    },
  };
}

function resolveVinculos(
  pending: readonly PendingVinculo[],
  temaIds: ReadonlyMap<number, string>,
): ProposicaoTemaRow[] {
  const rows: ProposicaoTemaRow[] = [];

  for (const item of pending) {
    const temaId = temaIds.get(item.externalCodTema);

    if (temaId === undefined) {
      continue;
    }

    rows.push({
      externalIdProposicao: item.externalIdProposicao,
      externalCodTema: item.externalCodTema,
      proposicaoId: item.proposicaoId,
      temaId,
    });
  }

  return rows;
}
