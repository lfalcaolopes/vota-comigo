import { createDeputadoProposicaoAssinadaStep } from './deputado-proposicao-assinada.step';
import type { CsvRow } from '../../sources/csv-reader';
import type {
  DeputadoProposicaoAssinadaRepository,
  DeputadoProposicaoAssinadaRow,
  ProposicaoTipoRow,
} from './deputado-proposicao-assinada.repository.types';
import type { IngestionStepContext } from '../../types/ingestion-pipeline-runner.types';

const DEPUTADO_A_EXTERNAL = 204379;
const DEPUTADO_A = 'deputado-uuid-A';
const DEPUTADO_B_EXTERNAL = 178957;
const DEPUTADO_B = 'deputado-uuid-B';

async function* rows(items: readonly CsvRow[]): AsyncIterable<CsvRow> {
  for (const item of items) {
    yield item;
  }
}

function autoresRow(
  overrides: Record<string, string> = {},
  lineNumber = 2,
): CsvRow {
  return {
    lineNumber,
    record: {
      idProposicao: '2642000',
      idDeputadoAutor: String(DEPUTADO_A_EXTERNAL),
      ordemAssinatura: '1',
      ...overrides,
    },
  };
}

function proposicoesRow(
  overrides: Record<string, string> = {},
  lineNumber = 2,
): CsvRow {
  return {
    lineNumber,
    record: {
      id: '2642000',
      siglaTipo: 'PL',
      codTipo: '139',
      descricaoTipo: 'Projeto de Lei',
      dataApresentacao: '2025-02-11T17:58:00',
      ...overrides,
    },
  };
}

type FakeRepository = DeputadoProposicaoAssinadaRepository & {
  readonly replacements: {
    year: number;
    rows: DeputadoProposicaoAssinadaRow[];
  }[];
  readonly tipoUpserts: ProposicaoTipoRow[][];
};

function createFakeRepository(
  overrides: Partial<DeputadoProposicaoAssinadaRepository> = {},
): FakeRepository {
  const replacements: {
    year: number;
    rows: DeputadoProposicaoAssinadaRow[];
  }[] = [];
  const tipoUpserts: ProposicaoTipoRow[][] = [];

  return {
    replacements,
    tipoUpserts,
    async loadDeputadoIdByExternalId() {
      return new Map([
        [DEPUTADO_A_EXTERNAL, DEPUTADO_A],
        [DEPUTADO_B_EXTERNAL, DEPUTADO_B],
      ]);
    },
    async upsertTipos(tipoRows) {
      tipoUpserts.push([...tipoRows]);
    },
    async replaceAno(year, incoming) {
      const snapshot = [...incoming];
      replacements.push({ year, rows: snapshot });
      return { inserted: snapshot.length };
    },
    ...overrides,
  };
}

type DatasetFiles = Record<string, Record<number, CsvRow[] | undefined>>;

function context(
  files: DatasetFiles,
  overrides: Partial<IngestionStepContext> = {},
): IngestionStepContext {
  return {
    dryRun: false,
    strict: false,
    debug: false,
    sourceFile: 'deputado_proposicao_assinada',
    years: [2025],
    readRecords: () => rows([]),
    readDataset: (dataset, year) => {
      const fileRows = files[dataset]?.[year];
      if (fileRows === undefined) {
        return undefined;
      }
      return () => rows(fileRows);
    },
    ...overrides,
  };
}

// Single-year publishable scope: neighbours 2024/2026 exist on disk and are
// also in scope, satisfying the vizinhança rule at both boundaries.
function publishableFiles(overrides: DatasetFiles = {}): DatasetFiles {
  return {
    proposicoesAutores: {
      2024: [],
      2025: [autoresRow()],
      2026: [],
      ...overrides.proposicoesAutores,
    },
    proposicoes: {
      2024: [],
      2025: [proposicoesRow()],
      2026: [],
      ...overrides.proposicoes,
    },
  };
}

describe('deputado_proposicao_assinada step', () => {
  describe('when the deputado table is empty', () => {
    it('does not calculate anything and preserves whatever is loaded', async () => {
      // Arrange
      const repository = createFakeRepository({
        loadDeputadoIdByExternalId: async () => new Map(),
      });
      const step = createDeputadoProposicaoAssinadaStep(repository);

      // Act
      const result = await step.run(context({}, { years: [2025] }));

      // Assert
      expect(result).toMatchObject({ read: 0, inserted: 0 });
      expect(repository.replacements).toEqual([]);
    });
  });

  describe('when siglaTipo is DOC or OF', () => {
    it('excludes the proposicao from the published counts', async () => {
      // Arrange
      const repository = createFakeRepository();
      const step = createDeputadoProposicaoAssinadaStep(repository);
      const files = publishableFiles({
        proposicoes: {
          2024: [],
          2025: [proposicoesRow({ siglaTipo: 'DOC' })],
          2026: [],
        },
      });

      // Act
      const result = await step.run(
        context(files, { years: [2024, 2025, 2026] }),
      );

      // Assert
      expect(result.ignored).toBeGreaterThanOrEqual(1);
      const replacement = repository.replacements.find((r) => r.year === 2025);
      expect(replacement).toBeUndefined();
    });
  });

  describe('when dataApresentacao falls in a different year than the source file', () => {
    it('publishes to the bucket of dataApresentacao, not the file year', async () => {
      // Arrange
      const repository = createFakeRepository();
      const step = createDeputadoProposicaoAssinadaStep(repository);
      const files = publishableFiles({
        proposicoes: {
          2024: [],
          2025: [proposicoesRow({ dataApresentacao: '2024-12-30T10:00:00' })],
          2026: [],
        },
      });

      // Act
      const result = await step.run(
        context(files, { years: [2024, 2025, 2026] }),
      );

      // Assert
      expect(result.externalGaps).not.toContainEqual(
        expect.objectContaining({ type: 'ano_fora_do_escopo' }),
      );
      const replacement2024 = repository.replacements.find(
        (r) => r.year === 2024,
      );
      expect(replacement2024?.rows).toEqual([
        expect.objectContaining({ deputadoId: DEPUTADO_A, year: 2024 }),
      ]);
    });
  });

  describe('when a deputado signs the same proposicao twice', () => {
    it('counts one proposicao, not two', async () => {
      // Arrange
      const repository = createFakeRepository();
      const step = createDeputadoProposicaoAssinadaStep(repository);
      const files = publishableFiles({
        proposicoesAutores: {
          2024: [],
          2025: [
            autoresRow({ ordemAssinatura: '3' }),
            autoresRow({ ordemAssinatura: '5' }, 3),
          ],
          2026: [],
        },
      });

      // Act
      await step.run(context(files, { years: [2024, 2025, 2026] }));

      // Assert
      const replacement = repository.replacements.find((r) => r.year === 2025);
      expect(replacement?.rows[0]?.assinaturasJson).toEqual({
        '2025-02-11': [1, 0],
      });
    });
  });

  describe('when ordemAssinatura = 1', () => {
    it('feeds only the second counter, not a subset of the total', async () => {
      // Arrange
      const repository = createFakeRepository();
      const step = createDeputadoProposicaoAssinadaStep(repository);
      const files = publishableFiles({
        proposicoesAutores: {
          2024: [],
          2025: [autoresRow({ ordemAssinatura: '1' })],
          2026: [],
        },
      });

      // Act
      await step.run(context(files, { years: [2024, 2025, 2026] }));

      // Assert
      const replacement = repository.replacements.find((r) => r.year === 2025);
      expect(replacement?.rows[0]?.assinaturasJson).toEqual({
        '2025-02-11': [1, 1],
      });
    });
  });

  describe('when a pendente is resolved by a proposicoes-{ano}.csv from a different year', () => {
    it('resolves it in the late pass and publishes it to the correct bucket', async () => {
      // Arrange
      const repository = createFakeRepository();
      const step = createDeputadoProposicaoAssinadaStep(repository);
      const files = publishableFiles({
        proposicoesAutores: {
          2024: [],
          2025: [autoresRow({ idProposicao: '6749' })],
          2026: [],
        },
        proposicoes: {
          2024: [],
          2025: [],
          2026: [],
          2016: [
            proposicoesRow({
              id: '6749',
              dataApresentacao: '2025-03-01T10:00:00',
            }),
          ],
        },
      });

      // Act
      const result = await step.run(
        context(files, { years: [2024, 2025, 2026] }),
      );

      // Assert
      expect(result.externalGaps).not.toContainEqual(
        expect.objectContaining({ type: 'proposicao_ausente' }),
      );
      const replacement2025 = repository.replacements.find(
        (r) => r.year === 2025,
      );
      expect(replacement2025?.rows).toEqual([
        expect.objectContaining({ deputadoId: DEPUTADO_A }),
      ]);
    });
  });

  describe('when a pendente is not resolved anywhere in disco', () => {
    it('reports proposicao_ausente and does not publish it', async () => {
      // Arrange
      const repository = createFakeRepository();
      const step = createDeputadoProposicaoAssinadaStep(repository);
      const files = publishableFiles({
        proposicoesAutores: {
          2024: [],
          2025: [autoresRow({ idProposicao: '999999' })],
          2026: [],
        },
        proposicoes: { 2024: [], 2025: [], 2026: [] },
      });

      // Act
      const result = await step.run(
        context(files, { years: [2024, 2025, 2026] }),
      );

      // Assert
      expect(result.externalGaps).toContainEqual(
        expect.objectContaining({
          type: 'proposicao_ausente',
          reference: '999999',
        }),
      );
    });
  });

  describe('when the scope is a single year with unscanned neighbours on disk', () => {
    it('does not publish anything and reports ano_fora_do_escopo', async () => {
      // Arrange
      const repository = createFakeRepository();
      const step = createDeputadoProposicaoAssinadaStep(repository);
      const files = publishableFiles();

      // Act
      const result = await step.run(context(files, { years: [2025] }));

      // Assert
      expect(repository.replacements).toEqual([]);
      expect(result.externalGaps).toContainEqual(
        expect.objectContaining({
          type: 'ano_fora_do_escopo',
          reference: '2025',
        }),
      );
    });
  });

  describe('when the swept neighbourhood sits exactly at the piso and teto of disco', () => {
    it('publishes both boundary years with only two files each', async () => {
      // Arrange
      const repository = createFakeRepository();
      const step = createDeputadoProposicaoAssinadaStep(repository);
      const files: DatasetFiles = {
        proposicoesAutores: {
          2015: [autoresRow({ idProposicao: '111' })],
          2016: [autoresRow({ idProposicao: '222' })],
        },
        proposicoes: {
          2015: [
            proposicoesRow({
              id: '111',
              dataApresentacao: '2015-05-01T00:00:00',
            }),
          ],
          2016: [
            proposicoesRow({
              id: '222',
              dataApresentacao: '2016-05-01T00:00:00',
            }),
          ],
        },
      };

      // Act
      const result = await step.run(context(files, { years: [2015, 2016] }));

      // Assert
      expect(result.externalGaps).not.toContainEqual(
        expect.objectContaining({ type: 'ano_fora_do_escopo' }),
      );
      expect(repository.replacements.map((r) => r.year).sort()).toEqual([
        2015, 2016,
      ]);
    });
  });

  describe('when an author is institutional or the deputado is outside the ADR 003 universe', () => {
    it('ignores the row instead of gapping it', async () => {
      // Arrange
      const repository = createFakeRepository();
      const step = createDeputadoProposicaoAssinadaStep(repository);
      const files = publishableFiles({
        proposicoesAutores: {
          2024: [],
          2025: [
            autoresRow({ idDeputadoAutor: '' }),
            autoresRow({ idDeputadoAutor: '1', idProposicao: '555' }, 3),
          ],
          2026: [],
        },
      });

      // Act
      const result = await step.run(
        context(files, { years: [2024, 2025, 2026] }),
      );

      // Assert
      expect(result.ignored).toBeGreaterThanOrEqual(2);
      expect(result.externalGaps).not.toContainEqual(
        expect.objectContaining({ type: 'proposicao_ausente' }),
      );
    });
  });

  describe('when the sweep finds no usable row anywhere', () => {
    it('publishes nothing and preserves the previous load', async () => {
      // Arrange
      const repository = createFakeRepository();
      const step = createDeputadoProposicaoAssinadaStep(repository);
      const files: DatasetFiles = {
        proposicoesAutores: { 2025: [] },
        proposicoes: { 2025: [] },
      };

      // Act
      const result = await step.run(context(files, { years: [2025] }));

      // Assert
      expect(repository.replacements).toEqual([]);
      expect(result.externalGaps).toContainEqual(
        expect.objectContaining({ type: 'fonte_vazia' }),
      );
    });
  });

  describe('when running in dry-run mode', () => {
    it('computes results but never writes the repository', async () => {
      // Arrange
      const repository = createFakeRepository();
      const step = createDeputadoProposicaoAssinadaStep(repository);
      const files = publishableFiles();

      // Act
      const result = await step.run(
        context(files, { years: [2024, 2025, 2026], dryRun: true }),
      );

      // Assert
      expect(result.read).toBeGreaterThan(0);
      expect(repository.replacements).toEqual([]);
      expect(repository.tipoUpserts).toEqual([]);
    });
  });

  describe('when strict mode is enabled', () => {
    it('aborts on the first rejection and writes nothing', async () => {
      // Arrange
      const repository = createFakeRepository();
      const step = createDeputadoProposicaoAssinadaStep(repository);
      const files = publishableFiles({
        proposicoes: {
          2024: [],
          2025: [proposicoesRow({ dataApresentacao: '' })],
          2026: [],
        },
      });

      // Act / Assert
      await expect(
        step.run(context(files, { years: [2024, 2025, 2026], strict: true })),
      ).rejects.toThrow();
      expect(repository.replacements).toEqual([]);
    });
  });

  describe('when a proposicoesAutores file for a year in scope is absent', () => {
    it('reports fonte_ausente and continues with the remaining years', async () => {
      // Arrange
      const repository = createFakeRepository();
      const step = createDeputadoProposicaoAssinadaStep(repository);
      const files = publishableFiles({
        proposicoesAutores: { 2024: [], 2025: undefined, 2026: [] },
      });

      // Act
      const result = await step.run(
        context(files, { years: [2024, 2025, 2026] }),
      );

      // Assert
      expect(result.externalGaps).toContainEqual(
        expect.objectContaining({ type: 'fonte_ausente', reference: '2025' }),
      );
    });
  });
});
