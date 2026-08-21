import type { IngestionStepContext } from '../../types/ingestion-pipeline-runner.types';
import type { DeputadoCotaUsoRepository } from './deputado-cota-uso.repository.types';
import { createDeputadoCotaUsoStep } from './deputado-cota-uso.step';

function context(dryRun = false): IngestionStepContext {
  return {
    dryRun,
    strict: false,
    debug: false,
    sourceFile: 'deputado_cota_uso',
    readRecords: async function* () {},
  };
}

function repository(): DeputadoCotaUsoRepository & {
  replaced: Parameters<DeputadoCotaUsoRepository['replaceAll']>[0] | null;
} {
  const repo = {
    replaced: null as
      | Parameters<DeputadoCotaUsoRepository['replaceAll']>[0]
      | null,
    loadCoberturas: async () => [
      {
        year: 2023,
        coveredThroughMonth: 2,
        sigepaReposto: false,
        sigepaCoveredThroughMonth: null,
      },
    ],
    loadLegislaturas: async () => [
      { legislatura: 57, dataInicio: '2023-02-01', dataFim: '2027-01-31' },
    ],
    loadDeputados: async () => [
      {
        deputadoId: 'mineiro',
        externalIdDeputado: 204445,
        intervalosExercicio: [{ openedAt: '2023-02-01', closedAt: null }],
        gastos: [],
        ufs: [{ dataInicio: '2023-02-01', dataFim: null, siglaUf: 'RN' }],
      },
      {
        deputadoId: 'calculavel',
        externalIdDeputado: 1,
        intervalosExercicio: [{ openedAt: '2023-02-01', closedAt: null }],
        gastos: [],
        ufs: [{ dataInicio: '2023-02-01', dataFim: null, siglaUf: 'SP' }],
      },
    ],
    async replaceAll(
      rows: Parameters<DeputadoCotaUsoRepository['replaceAll']>[0],
    ) {
      repo.replaced = rows;
      return { inserted: rows.length };
    },
  };
  return repo;
}

describe('deputado_cota_uso step', () => {
  it('materializes one row per deputado from the available intervals', async () => {
    // Arrange
    const repo = repository();
    const step = createDeputadoCotaUsoStep(
      repo,
      () => new Date('2023-02-28T12:00:00Z'),
    );

    // Act
    const result = await step.run(context());

    // Assert
    expect(result).toMatchObject({ read: 2, inserted: 2 });
    expect(repo.replaced).toHaveLength(2);
    expect(repo.replaced?.[0]).toMatchObject({
      deputadoId: 'mineiro',
      apuracao: { status: 'calculavel', percentualTetoBase: 0 },
    });
    expect(repo.replaced?.[1]).toMatchObject({
      deputadoId: 'calculavel',
      apuracao: { status: 'calculavel', percentualTetoBase: 0 },
    });
  });

  it('does not replace the materialization in dry-run', async () => {
    // Arrange
    const repo = repository();
    const step = createDeputadoCotaUsoStep(repo);

    // Act
    const result = await step.run(context(true));

    // Assert
    expect(result).toMatchObject({ read: 2, inserted: 0 });
    expect(repo.replaced).toBeNull();
  });
});
