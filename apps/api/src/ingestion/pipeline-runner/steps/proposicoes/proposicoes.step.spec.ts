import { createProposicoesStep } from './proposicoes.step';
import { createFonteDerivadaProposicoesAfetadas } from './fonte-derivada-proposicoes-afetadas';
import type { CsvRecord, CsvRow } from '../../sources/csv-reader';
import type { DatasetDownloader } from '../../shared/dataset-downloader';
import type {
  ProposicaoRepository,
  ProposicaoRow,
  ProposicaoUpsertResult,
} from './proposicoes.repository.types';
import type {
  CsvRowSource,
  IngestionStepContext,
} from '../../types/ingestion-pipeline-runner.types';

async function* rows(items: readonly CsvRecord[]): AsyncIterable<CsvRow> {
  let lineNumber = 1;
  for (const record of items) {
    lineNumber += 1;
    yield { lineNumber, record };
  }
}

function source(items: readonly CsvRecord[]): CsvRowSource {
  return () => rows(items);
}

function voto(idVotacao: string): CsvRecord {
  return {
    idVotacao,
    deputado_uri: 'https://dadosabertos.camara.leg.br/api/v2/deputados/1',
  };
}

function link(idVotacao: string, id: string, ano: string): CsvRecord {
  return { idVotacao, proposicao_id: id, proposicao_ano: ano };
}

function proposicaoRecord(id: string, ano: string): CsvRecord {
  return {
    id,
    uri: `https://dadosabertos.camara.leg.br/api/v2/proposicoes/${id}`,
    siglaTipo: 'PL',
    numero: '1',
    ano,
    codTipo: '139',
    ementa: `Ementa ${id}`,
    keywords: 'k',
    urlInteiroTeor: 'http://x',
    ultimoStatus_regime: 'Urgencia',
    ultimoStatus_descricaoSituacao: 'Tramitando',
  };
}

type Datasets = Record<string, Record<number, readonly CsvRecord[]>>;

function createFakeRepository(): ProposicaoRepository & {
  readonly upserted: ProposicaoRow[][];
} {
  const store = new Set<number>();
  const upserted: ProposicaoRow[][] = [];
  return {
    upserted,
    async upsert(incoming): Promise<ProposicaoUpsertResult> {
      upserted.push([...incoming]);
      let inserted = 0;
      let updated = 0;
      for (const item of incoming) {
        if (store.has(item.externalIdProposicao)) {
          updated += 1;
        } else {
          inserted += 1;
        }
        store.add(item.externalIdProposicao);
      }
      return { inserted, updated };
    },
  };
}

function createFakeDownloader(
  behavior: (years: readonly number[]) => void,
): DatasetDownloader & { readonly calls: number[][] } {
  const calls: number[][] = [];
  return {
    calls,
    async download(years) {
      calls.push([...years]);
      behavior(years);
      return { ok: true };
    },
  };
}

function buildStep(
  repository: ProposicaoRepository,
  downloader: DatasetDownloader = createFakeDownloader(() => {}),
) {
  const fonteDerivada = createFonteDerivadaProposicoesAfetadas({
    proposicoesDownloader: downloader,
    temasDownloader: createFakeDownloader(() => {}),
  });

  return createProposicoesStep({ repository, fonteDerivada });
}

function context(
  datasets: Datasets,
  overrides: Partial<IngestionStepContext> = {},
): IngestionStepContext {
  return {
    dryRun: false,
    strict: false,
    debug: false,
    sourceFile: 'proposicoes',
    years: [2024],
    readRecords: () => rows([]),
    readDataset: (dataset, year) => {
      const records = datasets[dataset]?.[year];
      return records === undefined ? undefined : source(records);
    },
    ...overrides,
  };
}

describe('proposicoes step', () => {
  describe('when ingesting affected proposicoes from local CSVs', () => {
    it('imports only the needed proposicoes across their own years', async () => {
      // Arrange
      const datasets: Datasets = {
        votacoesVotos: { 2024: [voto('2024-1')] },
        votacoesProposicoes: {
          2024: [link('2024-1', '111', '2015'), link('2024-1', '222', '2024')],
        },
        proposicoes: {
          2015: [
            proposicaoRecord('111', '2015'),
            proposicaoRecord('999', '2015'),
          ],
          2024: [proposicaoRecord('222', '2024')],
        },
      };
      const repository = createFakeRepository();
      const step = buildStep(repository);

      // Act
      const result = await step.run(context(datasets));

      // Assert
      expect(result).toMatchObject({ read: 2, inserted: 2, externalGaps: [] });
      const ingestedIds = repository.upserted
        .flat()
        .map((r) => r.externalIdProposicao);
      expect(ingestedIds.sort()).toEqual([111, 222]);
    });
  });

  describe('when a needed proposicao year file is missing on disk', () => {
    it('downloads the missing years before ingesting', async () => {
      // Arrange
      const datasets: Datasets = {
        votacoesVotos: { 2024: [voto('2024-1')] },
        votacoesProposicoes: { 2024: [link('2024-1', '111', '2007')] },
        proposicoes: {},
      };
      const repository = createFakeRepository();
      const downloader = createFakeDownloader(() => {
        datasets.proposicoes[2007] = [proposicaoRecord('111', '2007')];
      });
      const step = buildStep(repository, downloader);

      // Act
      const result = await step.run(context(datasets));

      // Assert
      expect(downloader.calls).toEqual([[2007]]);
      expect(result).toMatchObject({ read: 1, inserted: 1, externalGaps: [] });
    });
  });

  describe('when a required download fails', () => {
    it('stops the run with a resume instruction and never writes', async () => {
      // Arrange
      const datasets: Datasets = {
        votacoesVotos: { 2024: [voto('2024-1')] },
        votacoesProposicoes: { 2024: [link('2024-1', '111', '2007')] },
        proposicoes: {},
      };
      const repository = createFakeRepository();
      const failing: DatasetDownloader = {
        async download() {
          return { ok: false, failures: [{ year: 2007, reason: 'HTTP 503' }] };
        },
      };
      const step = buildStep(repository, failing);

      // Act / Assert
      await expect(step.run(context(datasets))).rejects.toThrow(/proposicoes/i);
      expect(repository.upserted).toEqual([]);
    });
  });

  describe('when a needed proposicao is in no CSV', () => {
    it('records a gap without a synthetic record and continues in default mode', async () => {
      // Arrange
      const datasets: Datasets = {
        votacoesVotos: { 2024: [voto('2024-1')] },
        votacoesProposicoes: {
          2024: [link('2024-1', '111', '2015'), link('2024-1', '222', '2015')],
        },
        proposicoes: { 2015: [proposicaoRecord('111', '2015')] },
      };
      const repository = createFakeRepository();
      const step = buildStep(repository);

      // Act
      const result = await step.run(context(datasets));

      // Assert
      expect(result.read).toBe(1);
      expect(result.externalGaps).toHaveLength(1);
      expect(result.externalGaps[0]).toMatchObject({
        type: 'proposicao_ausente',
        reference: '222',
      });
      expect(
        repository.upserted.flat().map((r) => r.externalIdProposicao),
      ).toEqual([111]);
    });

    it('aborts in strict mode when a needed proposicao is missing', async () => {
      // Arrange
      const datasets: Datasets = {
        votacoesVotos: { 2024: [voto('2024-1')] },
        votacoesProposicoes: { 2024: [link('2024-1', '222', '2015')] },
        proposicoes: { 2015: [proposicaoRecord('111', '2015')] },
      };
      const repository = createFakeRepository();
      const step = buildStep(repository);

      // Act / Assert
      await expect(
        step.run(context(datasets, { strict: true })),
      ).rejects.toThrow();
    });
  });

  describe('when running in dry-run mode', () => {
    it('never downloads and never writes, reporting missing files as gaps', async () => {
      // Arrange
      const datasets: Datasets = {
        votacoesVotos: { 2024: [voto('2024-1')] },
        votacoesProposicoes: { 2024: [link('2024-1', '111', '2007')] },
        proposicoes: {},
      };
      const repository = createFakeRepository();
      const downloader = createFakeDownloader(() => {});
      const step = buildStep(repository, downloader);

      // Act
      const result = await step.run(context(datasets, { dryRun: true }));

      // Assert
      expect(downloader.calls).toEqual([]);
      expect(repository.upserted).toEqual([]);
      expect(result.externalGaps.length).toBeGreaterThan(0);
    });
  });
});
