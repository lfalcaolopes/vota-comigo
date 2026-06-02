import { createIngestionSteps } from '../ingestion-steps';
import type {
  DatabaseClient,
  DrizzleDatabase,
} from '../../../shared/database/client';

const fakeDatabase = {} as DrizzleDatabase;

describe('ingestion steps provider', () => {
  describe('when running in dry-run mode', () => {
    it('builds the steps without opening a database connection', async () => {
      // Arrange
      let factoryCalled = false;
      const databaseClientFactory = (): DatabaseClient => {
        factoryCalled = true;
        return { db: fakeDatabase, close: async () => {} };
      };

      // Act
      const { steps } = await createIngestionSteps(
        { dryRun: true },
        { databaseClientFactory },
      );

      // Assert
      expect(factoryCalled).toBe(false);
      expect(steps.map((step) => step.name)).toContain('legislaturas');
      expect(steps.map((step) => step.name)).toContain('deputado_historico');
      expect(steps.map((step) => step.name)).toContain('votacoes');
      expect(steps.map((step) => step.name)).toContain('votacao_votos');
    });
  });

  describe('when running with persistence enabled', () => {
    it('opens a database connection and closes it when asked', async () => {
      // Arrange
      let closed = false;
      const databaseClientFactory = (): DatabaseClient => ({
        db: fakeDatabase,
        close: async () => {
          closed = true;
        },
      });

      // Act
      const { steps, close } = await createIngestionSteps(
        { dryRun: false },
        { databaseClientFactory },
      );
      await close();

      // Assert
      expect(steps.map((step) => step.name)).toContain('legislaturas');
      expect(steps.map((step) => step.name)).toContain('deputado_historico');
      expect(steps.map((step) => step.name)).toContain('votacoes');
      expect(steps.map((step) => step.name)).toContain('votacao_votos');
      expect(closed).toBe(true);
    });
  });
});
