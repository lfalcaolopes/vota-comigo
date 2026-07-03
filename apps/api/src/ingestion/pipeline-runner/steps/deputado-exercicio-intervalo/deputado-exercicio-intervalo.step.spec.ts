import {
  createDeputadoExercicioIntervaloStep,
  DEPUTADO_EXERCICIO_INTERVALO_RULE_VERSION,
} from './deputado-exercicio-intervalo.step';
import type {
  DeputadoComHistoricoRow,
  DeputadoExercicioIntervaloRepository,
  DeputadoExercicioIntervaloRow,
} from './deputado-exercicio-intervalo.repository.types';
import type { EventoExercicio } from '@/exercicio/types/exercicio.types';
import type { IngestionStepContext } from '../../types/ingestion-pipeline-runner.types';

const EVENTO_ENTRADA: EventoExercicio = {
  dataHora: '2023-01-01T00:00:00+00:00',
  situacao: 'Exercício',
  descricaoStatus: 'Entrada - Posse',
  partido: null,
};

const EVENTO_SAIDA: EventoExercicio = {
  dataHora: '2023-06-01T00:00:00+00:00',
  situacao: 'Fim de Mandato',
  descricaoStatus: 'Saída - Fim de Mandato',
  partido: null,
};

const EVENTO_NEUTRO: EventoExercicio = {
  dataHora: '2023-03-01T00:00:00+00:00',
  situacao: 'Exercício',
  descricaoStatus: 'Alteração de partido',
  partido: null,
};

function deputadoComHistorico(
  deputadoId: string,
  eventos: readonly EventoExercicio[],
): DeputadoComHistoricoRow {
  return { deputadoId, eventos };
}

function context(
  overrides: Partial<IngestionStepContext> = {},
): IngestionStepContext {
  return {
    dryRun: false,
    strict: false,
    debug: false,
    sourceFile: 'deputado_exercicio_intervalo',
    readRecords: async function* empty() {},
    ...overrides,
  };
}

function createFakeRepository(
  deputados: readonly DeputadoComHistoricoRow[],
): DeputadoExercicioIntervaloRepository & {
  rows: DeputadoExercicioIntervaloRow[];
  replaceCount: number;
} {
  const repository = {
    rows: [] as DeputadoExercicioIntervaloRow[],
    replaceCount: 0,
    async loadDeputadosComHistorico() {
      return deputados;
    },
    async fullReplace(rows: readonly DeputadoExercicioIntervaloRow[]) {
      repository.replaceCount += 1;
      repository.rows = [...rows];
      return { inserted: rows.length };
    },
  };
  return repository;
}

describe('deputado_exercicio_intervalo step', () => {
  describe('when there is no parliamentary history yet (first ingestion)', () => {
    it('skips the computation without touching the table', async () => {
      // Arrange
      const log = jest.fn();
      const repository = createFakeRepository([]);
      const step = createDeputadoExercicioIntervaloStep(repository);

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

  describe('when a deputado is still in exercise', () => {
    it('writes one still-open interval (closedAt null)', async () => {
      // Arrange
      const repository = createFakeRepository([
        deputadoComHistorico('dep-1', [EVENTO_ENTRADA]),
      ]);
      const step = createDeputadoExercicioIntervaloStep(repository);

      // Act
      const result = await step.run(context());

      // Assert
      expect(result).toMatchObject({ read: 1, inserted: 1, ignored: 0 });
      expect(repository.rows).toEqual([
        {
          deputadoId: 'dep-1',
          openedAt: EVENTO_ENTRADA.dataHora,
          closedAt: null,
          ruleVersion: DEPUTADO_EXERCICIO_INTERVALO_RULE_VERSION,
        },
      ]);
    });
  });

  describe('when a deputado entered and left exercise', () => {
    it('materializes one closed interval matching the source events', async () => {
      // Arrange
      const repository = createFakeRepository([
        deputadoComHistorico('dep-1', [
          EVENTO_ENTRADA,
          EVENTO_NEUTRO,
          EVENTO_SAIDA,
        ]),
      ]);
      const step = createDeputadoExercicioIntervaloStep(repository);

      // Act
      const result = await step.run(context());

      // Assert
      expect(result).toMatchObject({ read: 1, inserted: 1, ignored: 0 });
      expect(repository.rows).toEqual([
        {
          deputadoId: 'dep-1',
          openedAt: EVENTO_ENTRADA.dataHora,
          closedAt: EVENTO_SAIDA.dataHora,
          ruleVersion: DEPUTADO_EXERCICIO_INTERVALO_RULE_VERSION,
        },
      ]);
    });
  });

  describe('when a deputado history yields no interval', () => {
    it('is counted as ignored and writes no row', async () => {
      // Arrange
      const repository = createFakeRepository([
        deputadoComHistorico('dep-1', [EVENTO_NEUTRO]),
      ]);
      const step = createDeputadoExercicioIntervaloStep(repository);

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
      const repository = createFakeRepository([
        deputadoComHistorico('dep-1', [EVENTO_ENTRADA]),
      ]);
      const step = createDeputadoExercicioIntervaloStep(repository);

      // Act
      const result = await step.run(context({ dryRun: true }));

      // Assert
      expect(result).toMatchObject({ read: 1, inserted: 0 });
      expect(repository.replaceCount).toBe(0);
    });
  });
});
