import { importProposicaoResumoIaJson } from '../import/proposicao-resumo-ia-importer';
import type {
  ProposicaoResumoIaRepository,
  ProposicaoResumoIaUpsertResult,
} from '../repository/proposicao-resumo-ia.repository.types';

function fakeRepository(
  resolved: ReadonlyMap<number, string>,
  upsertResult?: ProposicaoResumoIaUpsertResult,
): ProposicaoResumoIaRepository & {
  upserted: Parameters<ProposicaoResumoIaRepository['upsert']>[0][];
} {
  const upserted: Parameters<ProposicaoResumoIaRepository['upsert']>[0][] = [];
  return {
    upserted,
    async resolveProposicaoIds(externalIds) {
      return new Map(
        externalIds.flatMap((externalId) => {
          const proposicaoId = resolved.get(externalId);
          return proposicaoId === undefined ? [] : [[externalId, proposicaoId]];
        }),
      );
    },
    async upsert(rows) {
      upserted.push(rows);
      return upsertResult ?? { inserted: rows.length, updated: 0 };
    },
    async loadProposicoesComputaveisSources() {
      return [];
    },
  };
}

describe('importProposicaoResumoIaJson', () => {
  describe('when an annual JSON has approved items', () => {
    it('resolves them and reports inserted and updated rows from the repository', async () => {
      // Arrange
      const repository = fakeRepository(
        new Map([
          [42, 'proposicao-42'],
          [43, 'proposicao-43'],
        ]),
        { inserted: 1, updated: 1 },
      );
      const json = {
        ano: 2024,
        items: {
          '42': {
            sourceHash: 'hash-atual',
            generationStatus: 'generated',
            reviewStatus: 'approved',
            resumoCard: 'Resumo curto aprovado.',
            resumoDetalhe: 'Resumo detalhado aprovado.',
            model: 'fixture-model',
            promptVersion: 'fixture-prompt',
            generatedAt: '2026-06-19T10:00:00Z',
            reviewedAt: '2026-06-19T11:00:00Z',
          },
          '43': {
            sourceHash: 'hash-revisado',
            generationStatus: 'generated',
            reviewStatus: 'approved',
            resumoCard: 'Resumo curto revisado.',
            resumoDetalhe: 'Resumo detalhado revisado.',
          },
        },
      };

      // Act
      const result = await importProposicaoResumoIaJson(json, { repository });

      // Assert
      expect(result).toEqual({
        filesRead: 1,
        validItems: 2,
        imported: 2,
        inserted: 1,
        updated: 1,
        skipped: 0,
        missingExternalIdProposicao: [],
      });
      expect(repository.upserted).toEqual([
        [
          {
            proposicaoId: 'proposicao-42',
            sourceHash: 'hash-atual',
            generationStatus: 'generated',
            reviewStatus: 'approved',
            resumoCard: 'Resumo curto aprovado.',
            resumoDetalhe: 'Resumo detalhado aprovado.',
            model: 'fixture-model',
            promptVersion: 'fixture-prompt',
            generatedAt: '2026-06-19T10:00:00Z',
            reviewedAt: '2026-06-19T11:00:00Z',
          },
          {
            proposicaoId: 'proposicao-43',
            sourceHash: 'hash-revisado',
            generationStatus: 'generated',
            reviewStatus: 'approved',
            resumoCard: 'Resumo curto revisado.',
            resumoDetalhe: 'Resumo detalhado revisado.',
            model: null,
            promptVersion: null,
            generatedAt: null,
            reviewedAt: null,
          },
        ],
      ]);
      expect(repository.upserted[0]?.[0]).not.toHaveProperty(
        'externalIdProposicao',
      );
    });
  });

  describe('when an annual JSON has non-public states', () => {
    it('projects them to the database for operational inspection', async () => {
      // Arrange
      const repository = fakeRepository(
        new Map([
          [42, 'proposicao-42'],
          [43, 'proposicao-43'],
          [44, 'proposicao-44'],
          [45, 'proposicao-45'],
          [46, 'proposicao-46'],
        ]),
      );
      const json = {
        ano: 2024,
        items: {
          '42': {
            sourceHash: 'hash-pending',
            generationStatus: 'generated',
            reviewStatus: 'pending',
            resumoCard: 'Resumo curto pendente.',
            resumoDetalhe: 'Resumo detalhado pendente.',
          },
          '43': {
            sourceHash: 'hash-rejected',
            generationStatus: 'generated',
            reviewStatus: 'rejected',
            resumoCard: 'Resumo curto rejeitado.',
            resumoDetalhe: 'Resumo detalhado rejeitado.',
          },
          '44': {
            sourceHash: 'hash-stale',
            generationStatus: 'generated',
            reviewStatus: 'stale',
            resumoCard: 'Resumo curto antigo.',
            resumoDetalhe: 'Resumo detalhado antigo.',
          },
          '45': {
            sourceHash: 'hash-error',
            generationStatus: 'error',
            reviewStatus: 'pending',
          },
          '46': {
            sourceHash: 'hash-insufficient',
            generationStatus: 'insufficient_source',
            reviewStatus: 'pending',
          },
        },
      };

      // Act
      const result = await importProposicaoResumoIaJson(json, { repository });

      // Assert
      expect(result).toEqual({
        filesRead: 1,
        validItems: 5,
        imported: 5,
        inserted: 5,
        updated: 0,
        skipped: 0,
        missingExternalIdProposicao: [],
      });
      expect(repository.upserted[0]?.map((row) => row.reviewStatus)).toEqual([
        'pending',
        'rejected',
        'stale',
        'pending',
        'pending',
      ]);
      expect(
        repository.upserted[0]?.map((row) => row.generationStatus),
      ).toEqual([
        'generated',
        'generated',
        'generated',
        'error',
        'insufficient_source',
      ]);
    });
  });

  describe('when the current database has no matching proposicao', () => {
    it('reports the unresolved external id without upserting it', async () => {
      // Arrange
      const repository = fakeRepository(new Map([[42, 'proposicao-uuid']]));
      const json = {
        ano: 2024,
        items: {
          '42': {
            sourceHash: 'hash-atual',
            generationStatus: 'generated',
            reviewStatus: 'approved',
            resumoCard: 'Resumo curto aprovado.',
            resumoDetalhe: 'Resumo detalhado aprovado.',
          },
          '99': {
            sourceHash: 'hash-sem-proposicao',
            generationStatus: 'generated',
            reviewStatus: 'approved',
            resumoCard: 'Resumo curto sem proposição.',
            resumoDetalhe: 'Resumo detalhado sem proposição.',
          },
        },
      };

      // Act
      const result = await importProposicaoResumoIaJson(json, { repository });

      // Assert
      expect(result).toEqual({
        filesRead: 1,
        validItems: 2,
        imported: 1,
        inserted: 1,
        updated: 0,
        skipped: 1,
        missingExternalIdProposicao: [99],
      });
      expect(repository.upserted).toHaveLength(1);
      expect(repository.upserted[0]?.map((row) => row.proposicaoId)).toEqual([
        'proposicao-uuid',
      ]);
    });
  });

  describe('when the annual JSON is invalid', () => {
    it('rejects unknown generationStatus', async () => {
      // Arrange
      const repository = fakeRepository(new Map([[42, 'proposicao-uuid']]));
      const json = {
        ano: 2024,
        items: {
          '42': {
            sourceHash: 'hash-atual',
            generationStatus: 'queued',
            reviewStatus: 'approved',
            resumoCard: 'Resumo aprovado.',
            resumoDetalhe: 'Resumo detalhado aprovado.',
          },
        },
      };

      // Act / Assert
      await expect(
        importProposicaoResumoIaJson(json, { repository }),
      ).rejects.toThrow();
      expect(repository.upserted).toEqual([]);
    });
  });
});
