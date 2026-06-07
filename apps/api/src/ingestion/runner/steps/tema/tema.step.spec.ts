import { createTemaStep } from './tema.step';
import type { CsvRecord, CsvRow } from '../../csv-reader';
import type { DatasetDownloader } from '../../shared/dataset-downloader';
import { createFonteDerivadaProposicoesAfetadas } from '../proposicoes/fonte-derivada-proposicoes-afetadas';
import type { ProposicaoLookup } from '../votacao-proposicao/votacao-proposicao.repository.types';
import type {
  ProposicaoTemaRow,
  TemaLookup,
  TemaRepository,
  TemaRow,
  UpsertResult,
} from './tema.repository.types';
import type {
  CsvRowSource,
  IngestionStepContext,
} from '../../ingestion-runner.types';

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

function temaRecord(id: string, codTema: string, nome: string): CsvRecord {
  return {
    uriProposicao: `https://dadosabertos.camara.leg.br/api/v2/proposicoes/${id}`,
    codTema,
    tema: nome,
    relevancia: '0',
  };
}

type Datasets = Record<string, Record<number, readonly CsvRecord[]>>;

type FakeRepository = TemaRepository & {
  readonly temas: TemaRow[][];
  readonly vinculos: ProposicaoTemaRow[][];
  readonly temaStore: Set<number>;
};

function createFakeRepository(): FakeRepository {
  const temaStore = new Set<number>();
  const vinculoStore = new Set<string>();
  const temas: TemaRow[][] = [];
  const vinculos: ProposicaoTemaRow[][] = [];
  return {
    temas,
    vinculos,
    temaStore,
    async upsertTemas(incoming): Promise<UpsertResult> {
      temas.push([...incoming]);
      let inserted = 0;
      let updated = 0;
      for (const item of incoming) {
        if (temaStore.has(item.externalCodTema)) {
          updated += 1;
        } else {
          inserted += 1;
        }
        temaStore.add(item.externalCodTema);
      }
      return { inserted, updated };
    },
    async upsertVinculos(incoming): Promise<UpsertResult> {
      vinculos.push([...incoming]);
      let inserted = 0;
      let updated = 0;
      for (const item of incoming) {
        const key = `${item.externalIdProposicao}:${item.externalCodTema}`;
        if (vinculoStore.has(key)) {
          updated += 1;
        } else {
          inserted += 1;
        }
        vinculoStore.add(key);
      }
      return { inserted, updated };
    },
  };
}

function proposicaoLookup(map: Record<number, string>): ProposicaoLookup {
  return {
    async loadIdByExternalId() {
      return new Map(
        Object.entries(map).map(([key, value]) => [Number(key), value]),
      );
    },
  };
}

// Resolve cada codTema persistido para um id estável, simulando o estado do
// banco após o upsert dos temas.
function temaLookup(temaStore: ReadonlySet<number>): TemaLookup {
  return {
    async loadIdByExternalCodTema() {
      return new Map([...temaStore].map((cod) => [cod, `tema-${cod}`]));
    },
  };
}

function createFakeDownloader(
  behavior: (years: readonly number[]) => void = () => {},
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

function context(
  datasets: Datasets,
  overrides: Partial<IngestionStepContext> = {},
): IngestionStepContext & { readonly requested: string[] } {
  const requested: string[] = [];
  return {
    requested,
    dryRun: false,
    strict: false,
    debug: false,
    sourceFile: 'tema',
    years: [2024],
    readRecords: () => rows([]),
    readDataset: (dataset, year) => {
      requested.push(dataset);
      const records = datasets[dataset]?.[year];
      return records === undefined ? undefined : source(records);
    },
    ...overrides,
  };
}

function buildStep(
  repository: FakeRepository,
  proposicoes: Record<number, string>,
  downloader: DatasetDownloader = createFakeDownloader(),
) {
  const fonteDerivada = createFonteDerivadaProposicoesAfetadas({
    proposicoesDownloader: createFakeDownloader(),
    temasDownloader: downloader,
  });

  return createTemaStep({
    repository,
    fonteDerivada,
    proposicaoLookup: proposicaoLookup(proposicoes),
    temaLookup: temaLookup(repository.temaStore),
  });
}

describe('tema step', () => {
  describe('when importing themes for ingested proposicoes', () => {
    it('creates temas and links only for proposicoes already ingested', async () => {
      // Arrange
      const datasets: Datasets = {
        votacoesVotos: { 2024: [voto('2024-1')] },
        votacoesProposicoes: { 2024: [link('2024-1', '111', '2020')] },
        proposicoesTemas: {
          2020: [
            temaRecord('111', '34', 'Administração Pública'),
            temaRecord('999', '40', 'Economia'),
          ],
        },
      };
      const repository = createFakeRepository();
      const step = buildStep(repository, { 111: 'prop-111' });

      // Act
      const result = await step.run(context(datasets));

      // Assert
      expect(result).toMatchObject({ read: 1, externalGaps: [] });
      expect(repository.temas.flat()).toEqual([
        { externalCodTema: 34, tema: 'Administração Pública' },
      ]);
      expect(repository.vinculos.flat()).toEqual([
        {
          externalIdProposicao: 111,
          externalCodTema: 34,
          proposicaoId: 'prop-111',
          temaId: 'tema-34',
        },
      ]);
    });

    it('derives theme years from the needed set, reading multiple years', async () => {
      // Arrange: votacao em 2024 aponta proposicoes apresentadas em 2015 e 2020
      const datasets: Datasets = {
        votacoesVotos: { 2024: [voto('2024-1')] },
        votacoesProposicoes: {
          2024: [link('2024-1', '111', '2015'), link('2024-1', '222', '2020')],
        },
        proposicoesTemas: {
          2015: [temaRecord('111', '34', 'Administração Pública')],
          2020: [temaRecord('222', '40', 'Economia')],
        },
      };
      const repository = createFakeRepository();
      const step = buildStep(repository, { 111: 'prop-111', 222: 'prop-222' });

      // Act
      const result = await step.run(context(datasets));

      // Assert
      expect(result).toMatchObject({ read: 2, externalGaps: [] });
      expect(
        repository.vinculos
          .flat()
          .map((row) => row.externalIdProposicao)
          .sort(),
      ).toEqual([111, 222]);
      expect(
        repository.temas
          .flat()
          .map((row) => row.externalCodTema)
          .sort(),
      ).toEqual([34, 40]);
    });

    it('keeps multiple themes for the same proposicao', async () => {
      // Arrange
      const datasets: Datasets = {
        votacoesVotos: { 2024: [voto('2024-1')] },
        votacoesProposicoes: { 2024: [link('2024-1', '111', '2020')] },
        proposicoesTemas: {
          2020: [
            temaRecord('111', '34', 'Administração Pública'),
            temaRecord('111', '40', 'Economia'),
          ],
        },
      };
      const repository = createFakeRepository();
      const step = buildStep(repository, { 111: 'prop-111' });

      // Act
      const result = await step.run(context(datasets));

      // Assert
      expect(result).toMatchObject({ read: 2 });
      expect(
        repository.vinculos
          .flat()
          .map((row) => row.externalCodTema)
          .sort(),
      ).toEqual([34, 40]);
    });
  });

  describe('when a theme belongs to a proposicao that was not ingested', () => {
    it('ignores the theme instead of creating an orphan link', async () => {
      // Arrange
      const datasets: Datasets = {
        votacoesVotos: { 2024: [voto('2024-1')] },
        votacoesProposicoes: { 2024: [link('2024-1', '111', '2020')] },
        proposicoesTemas: {
          2020: [
            temaRecord('111', '34', 'Administração Pública'),
            temaRecord('999', '40', 'Economia'),
          ],
        },
      };
      const repository = createFakeRepository();
      const step = buildStep(repository, { 111: 'prop-111' });

      // Act
      const result = await step.run(context(datasets));

      // Assert
      expect(result).toMatchObject({ read: 1, ignored: 1 });
      expect(
        repository.vinculos.flat().map((row) => row.externalIdProposicao),
      ).toEqual([111]);
    });
  });

  describe('when a needed theme file is missing on disk', () => {
    it('downloads the missing years before ingesting', async () => {
      // Arrange
      const datasets: Datasets = {
        votacoesVotos: { 2024: [voto('2024-1')] },
        votacoesProposicoes: { 2024: [link('2024-1', '111', '2007')] },
        proposicoesTemas: {},
      };
      const repository = createFakeRepository();
      const downloader = createFakeDownloader(() => {
        datasets.proposicoesTemas[2007] = [
          temaRecord('111', '34', 'Administração Pública'),
        ];
      });
      const step = buildStep(repository, { 111: 'prop-111' }, downloader);

      // Act
      const result = await step.run(context(datasets));

      // Assert
      expect(downloader.calls).toEqual([[2007]]);
      expect(result).toMatchObject({ read: 1, externalGaps: [] });
    });
  });

  describe('when a required download fails', () => {
    it('stops the run with a resume instruction and never writes', async () => {
      // Arrange
      const datasets: Datasets = {
        votacoesVotos: { 2024: [voto('2024-1')] },
        votacoesProposicoes: { 2024: [link('2024-1', '111', '2007')] },
        proposicoesTemas: {},
      };
      const repository = createFakeRepository();
      const failing: DatasetDownloader = {
        async download() {
          return { ok: false, failures: [{ year: 2007, reason: 'HTTP 503' }] };
        },
      };
      const step = buildStep(repository, { 111: 'prop-111' }, failing);

      // Act / Assert
      await expect(step.run(context(datasets))).rejects.toThrow(/tema/i);
      expect(repository.temas).toEqual([]);
      expect(repository.vinculos).toEqual([]);
    });
  });

  describe('when an ingested proposicao has no theme in any CSV', () => {
    // A maioria das proposições não recebe classificação temática do CEDI, então
    // a ausência de tema é o caso normal e não actionável: não vira lacuna no
    // relatório nem aborta o modo estrito (decisão posterior à issue #14).
    it('does not record a gap, ingesting the themes that do exist', async () => {
      // Arrange
      const datasets: Datasets = {
        votacoesVotos: { 2024: [voto('2024-1')] },
        votacoesProposicoes: {
          2024: [link('2024-1', '111', '2020'), link('2024-1', '222', '2020')],
        },
        proposicoesTemas: {
          2020: [temaRecord('111', '34', 'Administração Pública')],
        },
      };
      const repository = createFakeRepository();
      const step = buildStep(repository, { 111: 'prop-111', 222: 'prop-222' });

      // Act
      const result = await step.run(context(datasets));

      // Assert
      expect(result.read).toBe(1);
      expect(result.externalGaps).toEqual([]);
      expect(
        repository.vinculos.flat().map((row) => row.externalIdProposicao),
      ).toEqual([111]);
    });

    it('does not abort in strict mode', async () => {
      // Arrange
      const datasets: Datasets = {
        votacoesVotos: { 2024: [voto('2024-1')] },
        votacoesProposicoes: { 2024: [link('2024-1', '222', '2020')] },
        proposicoesTemas: {
          2020: [temaRecord('111', '34', 'Administração Pública')],
        },
      };
      const repository = createFakeRepository();
      const step = buildStep(repository, { 222: 'prop-222' });

      // Act
      const result = await step.run(context(datasets, { strict: true }));

      // Assert
      expect(result.externalGaps).toEqual([]);
    });
  });

  describe('when re-running the ingestion', () => {
    it('does not duplicate temas nor links', async () => {
      // Arrange
      const datasets: Datasets = {
        votacoesVotos: { 2024: [voto('2024-1')] },
        votacoesProposicoes: { 2024: [link('2024-1', '111', '2020')] },
        proposicoesTemas: {
          2020: [temaRecord('111', '34', 'Administração Pública')],
        },
      };
      const repository = createFakeRepository();
      const step = buildStep(repository, { 111: 'prop-111' });

      // Act
      await step.run(context(datasets));
      const second = await step.run(context(datasets));

      // Assert: segunda execução atualiza, não insere
      expect(second).toMatchObject({ read: 1, inserted: 0, updated: 2 });
    });
  });

  describe('when running in dry-run mode', () => {
    it('never downloads and never writes', async () => {
      // Arrange
      const datasets: Datasets = {
        votacoesVotos: { 2024: [voto('2024-1')] },
        votacoesProposicoes: { 2024: [link('2024-1', '111', '2007')] },
        proposicoesTemas: {},
      };
      const repository = createFakeRepository();
      const downloader = createFakeDownloader();
      const step = buildStep(repository, { 111: 'prop-111' }, downloader);

      // Act
      const result = await step.run(context(datasets, { dryRun: true }));

      // Assert
      expect(downloader.calls).toEqual([]);
      expect(repository.temas).toEqual([]);
      expect(repository.vinculos).toEqual([]);
      expect(result).toMatchObject({ inserted: 0, updated: 0 });
    });
  });
});
