import {
  createDeputadoPresencaStep,
  DEPUTADO_PRESENCA_RULE_VERSION,
} from './deputado-presenca.step';
import type {
  ComputableVotacaoRow,
  DeputadoComHistoricoRow,
  DeputadoPresencaRepository,
  DeputadoPresencaRow,
} from './deputado-presenca.repository.types';
import type { IngestionStepContext } from '../../types/ingestion-pipeline-runner.types';

const EVENTO_ENTRADA = {
  dataHora: '2023-01-01T00:00:00+00:00',
  situacao: 'Exercício',
  descricaoStatus: 'Entrada - Posse',
  partido: 'PT',
};

function deputadoComHistorico(
  deputadoId: string,
  eventos = [EVENTO_ENTRADA],
): DeputadoComHistoricoRow {
  return { deputadoId, eventos };
}

function votacaoComputavel(
  votosJson: Record<string, readonly string[]>,
  overrides: Partial<ComputableVotacaoRow> = {},
): ComputableVotacaoRow {
  return {
    votacaoId: 'votacao-1',
    dataHoraRegistro: '2023-06-01T10:00:00+00:00',
    data: '2023-06-01',
    votosJson: {
      sim: [],
      nao: [],
      abstencao: [],
      obstrucao: [],
      artigo_17: [],
      nao_informado: [],
      ...votosJson,
    },
    ...overrides,
  };
}

function context(
  overrides: Partial<IngestionStepContext> = {},
): IngestionStepContext {
  return {
    dryRun: false,
    strict: false,
    debug: false,
    sourceFile: 'deputado_presenca',
    readRecords: async function* empty() {},
    ...overrides,
  };
}

function createFakeRepository(
  deputados: readonly DeputadoComHistoricoRow[],
  votacoes: readonly ComputableVotacaoRow[],
): DeputadoPresencaRepository & {
  rows: DeputadoPresencaRow[];
  replaceCount: number;
} {
  const repository = {
    rows: [] as DeputadoPresencaRow[],
    replaceCount: 0,
    async loadDeputadosComHistorico() {
      return deputados;
    },
    async loadComputableVotacoes() {
      return votacoes;
    },
    async fullReplace(rows: readonly DeputadoPresencaRow[]) {
      repository.replaceCount += 1;
      repository.rows = [...rows];
      return { inserted: rows.length };
    },
  };
  return repository;
}

describe('deputado_presenca step', () => {
  describe('when there is no parliamentary history yet (first ingestion)', () => {
    it('skips the computation without touching the table', async () => {
      // Arrange
      const log = jest.fn();
      const repository = createFakeRepository([], []);
      const step = createDeputadoPresencaStep(repository);

      // Act
      const result = await step.run(context({ reporter: { log } }));

      // Assert
      expect(repository.replaceCount).toBe(0);
      expect(result).toMatchObject({ read: 0, inserted: 0 });
      expect(log).toHaveBeenCalledWith(
        expect.stringContaining('histórico ausente'),
      );
    });
  });

  describe('when a deputado voted in a computable votacao', () => {
    it('writes one presenca row with the derived counters', async () => {
      // Arrange
      const repository = createFakeRepository(
        [deputadoComHistorico('dep-1')],
        [votacaoComputavel({ sim: ['dep-1'] })],
      );
      const step = createDeputadoPresencaStep(repository);

      // Act
      const result = await step.run(context());

      // Assert
      expect(result).toMatchObject({ read: 1, inserted: 1, ignored: 0 });
      expect(repository.rows).toEqual([
        {
          deputadoId: 'dep-1',
          presencas: 1,
          ausenciasSemMotivoConhecido: 0,
          foraDeExercicio: 0,
          lacunaDeDados: 0,
          ruleVersion: DEPUTADO_PRESENCA_RULE_VERSION,
        },
      ]);
    });
  });

  describe('when a deputado is in exercise but did not vote', () => {
    it('counts the votacao as ausencia sem motivo conhecido', async () => {
      // Arrange
      const repository = createFakeRepository(
        [deputadoComHistorico('dep-1')],
        [
          votacaoComputavel({ sim: ['other'] }),
          votacaoComputavel({ sim: ['dep-1'] }, { votacaoId: 'votacao-2' }),
        ],
      );
      const step = createDeputadoPresencaStep(repository);

      // Act
      await step.run(context());

      // Assert
      expect(repository.rows).toEqual([
        {
          deputadoId: 'dep-1',
          presencas: 1,
          ausenciasSemMotivoConhecido: 1,
          foraDeExercicio: 0,
          lacunaDeDados: 0,
          ruleVersion: DEPUTADO_PRESENCA_RULE_VERSION,
        },
      ]);
    });
  });

  describe('when a deputado has history but no in-exercise votacao', () => {
    it('is excluded because the resumo is unavailable', async () => {
      // Arrange
      const foraDeExercicio = votacaoComputavel(
        { sim: ['other'] },
        {
          dataHoraRegistro: '2019-01-01T10:00:00+00:00',
          data: '2019-01-01',
        },
      );
      const repository = createFakeRepository(
        [deputadoComHistorico('dep-1')],
        [foraDeExercicio],
      );
      const step = createDeputadoPresencaStep(repository);

      // Act
      const result = await step.run(context());

      // Assert
      expect(result).toMatchObject({ read: 1, inserted: 0, ignored: 1 });
      expect(repository.rows).toEqual([]);
    });
  });

  describe('when running in dry-run mode', () => {
    it('computes without writing', async () => {
      // Arrange
      const repository = createFakeRepository(
        [deputadoComHistorico('dep-1')],
        [votacaoComputavel({ sim: ['dep-1'] })],
      );
      const step = createDeputadoPresencaStep(repository);

      // Act
      const result = await step.run(context({ dryRun: true }));

      // Assert
      expect(result).toMatchObject({ read: 1, inserted: 0 });
      expect(repository.replaceCount).toBe(0);
    });
  });
});
