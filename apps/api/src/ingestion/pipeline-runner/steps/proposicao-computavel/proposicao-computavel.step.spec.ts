import { createProposicaoComputavelStep } from './proposicao-computavel.step';
import type {
  ProposicaoComputavelCandidateRow,
  ProposicaoComputavelRepository,
  ProposicaoComputavelRow,
} from './proposicao-computavel.repository.types';
import type { IngestionStepContext } from '../../types/ingestion-pipeline-runner.types';

function candidate(
  overrides: Partial<ProposicaoComputavelCandidateRow> = {},
): ProposicaoComputavelCandidateRow {
  return {
    proposicaoId: 'proposicao-1',
    votacaoId: 'votacao-1',
    externalIdVotacao: '1-1',
    data: '2024-05-01',
    dataHoraRegistro: '2024-05-01T12:00:00Z',
    descricao: 'Aprovado o Projeto de Lei',
    ultimaAberturaVotacaoDescricao: null,
    ultimaApresentacaoProposicaoDescricao: null,
    votosSim: 300,
    votosNao: 100,
    votosOutros: 5,
    aprovacao: 1,
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
    sourceFile: 'proposicao_computavel',
    readRecords: async function* empty() {},
    ...overrides,
  };
}

function createFakeRepository(
  candidates: readonly ProposicaoComputavelCandidateRow[],
): ProposicaoComputavelRepository & {
  rows: ProposicaoComputavelRow[];
  replaceCount: number;
} {
  const repository = {
    rows: [{ ...projectionRow(), proposicaoId: 'obsolete' }],
    replaceCount: 0,
    async loadCandidates(): Promise<
      readonly ProposicaoComputavelCandidateRow[]
    > {
      return candidates;
    },
    async fullReplace(
      rows: readonly ProposicaoComputavelRow[],
    ): Promise<{ inserted: number }> {
      repository.replaceCount += 1;
      repository.rows = [...rows];
      return { inserted: rows.length };
    },
  };
  return repository;
}

function projectionRow(
  overrides: Partial<ProposicaoComputavelRow> = {},
): ProposicaoComputavelRow {
  return {
    proposicaoId: 'proposicao-1',
    votacaoReferenciaId: 'votacao-1',
    votacaoReferenciaPattern: 'projeto_de_lei',
    volumeVotacoesPlenario: 1,
    dataUltimaVotacao: '2024-05-01',
    ruleVersion: 1,
    ...overrides,
  };
}

describe('proposicao_computavel step', () => {
  describe('when a proposicao has a classifiable reference vote', () => {
    it('creates one projection row with the selected reference and aggregate fields', async () => {
      // Arrange
      const repository = createFakeRepository([candidate()]);
      const step = createProposicaoComputavelStep(repository);

      // Act
      const result = await step.run(context());

      // Assert
      expect(result).toMatchObject({ read: 1, inserted: 1, ignored: 0 });
      expect(repository.rows).toEqual([projectionRow()]);
    });
  });

  describe('when a proposicao has plenary votes but no reference classification', () => {
    it('excludes it from the projection', async () => {
      // Arrange
      const repository = createFakeRepository([
        candidate({ descricao: 'Requerimento de retirada de pauta' }),
      ]);
      const step = createProposicaoComputavelStep(repository);

      // Act
      const result = await step.run(context());

      // Assert
      expect(result).toMatchObject({ read: 1, inserted: 0, ignored: 1 });
      expect(repository.rows).toEqual([]);
    });
  });

  describe('when several votes are linked to the same proposicao', () => {
    it('chooses the same reference selected by selectVotacaoReferencia', async () => {
      // Arrange
      const repository = createFakeRepository([
        candidate({
          votacaoId: 'votacao-pl',
          externalIdVotacao: '1-1',
          descricao: 'Aprovado o Projeto de Lei',
          data: '2024-05-01',
        }),
        candidate({
          votacaoId: 'votacao-pec',
          externalIdVotacao: '1-2',
          descricao: 'Proposta de Emenda à Constituição',
          ultimaAberturaVotacaoDescricao: 'Votação em segundo turno',
          data: '2024-06-01',
        }),
      ]);
      const step = createProposicaoComputavelStep(repository);

      // Act
      await step.run(context());

      // Assert
      expect(repository.rows).toEqual([
        projectionRow({
          votacaoReferenciaId: 'votacao-pec',
          votacaoReferenciaPattern: 'pec_segundo_turno',
          volumeVotacoesPlenario: 2,
          dataUltimaVotacao: '2024-06-01',
        }),
      ]);
    });
  });

  describe('when the projection is rerun', () => {
    it('removes obsolete rows through full replace', async () => {
      // Arrange
      const repository = createFakeRepository([candidate()]);
      const step = createProposicaoComputavelStep(repository);

      // Act
      await step.run(context());

      // Assert
      expect(repository.replaceCount).toBe(1);
      expect(repository.rows).not.toContainEqual(
        expect.objectContaining({ proposicaoId: 'obsolete' }),
      );
    });
  });

  describe('when running in dry-run mode', () => {
    it('calculates counts without writing', async () => {
      // Arrange
      const repository = createFakeRepository([candidate()]);
      const step = createProposicaoComputavelStep(repository);

      // Act
      const result = await step.run(context({ dryRun: true }));

      // Assert
      expect(result).toMatchObject({ read: 1, inserted: 0, ignored: 0 });
      expect(repository.replaceCount).toBe(0);
      expect(repository.rows).toEqual([
        expect.objectContaining({ proposicaoId: 'obsolete' }),
      ]);
    });
  });
});
