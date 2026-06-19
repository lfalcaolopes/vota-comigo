import { importProposicaoResumoIaJson } from '../proposicao-resumo-ia-importer';
import type { ProposicaoResumoIaRepository } from '../proposicao-resumo-ia.repository.types';

function fakeRepository(
  resolved: ReadonlyMap<number, string>,
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
      return { inserted: rows.length, updated: 0 };
    },
  };
}

describe('importProposicaoResumoIaJson', () => {
  describe('when an annual JSON has an approved item', () => {
    it('resolves the external id to proposicao.id and upserts the projection', async () => {
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
            model: 'fixture-model',
            promptVersion: 'fixture-prompt',
            generatedAt: '2026-06-19T10:00:00Z',
            reviewedAt: '2026-06-19T11:00:00Z',
          },
        },
      };

      // Act
      const result = await importProposicaoResumoIaJson(json, { repository });

      // Assert
      expect(result).toEqual({ imported: 1, missing: [] });
      expect(repository.upserted).toEqual([
        [
          {
            proposicaoId: 'proposicao-uuid',
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
      expect(result).toEqual({ imported: 5, missing: [] });
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
      expect(result).toEqual({ imported: 1, missing: [99] });
      expect(repository.upserted).toHaveLength(1);
      expect(repository.upserted[0]?.map((row) => row.proposicaoId)).toEqual([
        'proposicao-uuid',
      ]);
    });
  });

  describe('when the annual JSON is invalid', () => {
    it('rejects texto above the card limit', async () => {
      // Arrange
      const repository = fakeRepository(new Map([[42, 'proposicao-uuid']]));
      const json = {
        ano: 2024,
        items: {
          '42': {
            sourceHash: 'hash-atual',
            generationStatus: 'generated',
            reviewStatus: 'approved',
            resumoCard: 'x'.repeat(181),
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
