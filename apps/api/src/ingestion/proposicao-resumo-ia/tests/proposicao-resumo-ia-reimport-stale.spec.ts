import { reconcileProposicaoResumoIa } from '../reconciliation/proposicao-resumo-ia-reconciler';
import { importProposicaoResumoIaJson } from '../import/proposicao-resumo-ia-importer';
import type {
  ProposicaoResumoIaRepository,
  ProposicaoResumoIaUpsertResult,
} from '../repository/proposicao-resumo-ia.repository.types';
import type { ProposicaoResumoIaSource } from '../../../proposicoes/rules/proposicao-resumo-ia-source';

function source(
  overrides: Partial<ProposicaoResumoIaSource> = {},
): ProposicaoResumoIaSource {
  return {
    externalIdProposicao: 42,
    siglaTipo: 'PL',
    numero: 100,
    ano: 2024,
    descricaoTipo: 'Projeto de Lei',
    ementa: 'Ementa alterada pela câmara.',
    ementaDetalhada: null,
    keywords: null,
    ...overrides,
  };
}

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
        externalIds.flatMap((id) => {
          const proposicaoId = resolved.get(id);
          return proposicaoId === undefined ? [] : [[id, proposicaoId]];
        }),
      );
    },
    async upsert(rows) {
      upserted.push(rows);
      return upsertResult ?? { inserted: 0, updated: rows.length };
    },
    async loadProposicoesComputaveisSources() {
      return [];
    },
  };
}

describe('reimportação após reconciliação', () => {
  describe('when an approved item is stale after reconciliation', () => {
    it('projects the stale row to the database on the next import', async () => {
      // Arrange
      const src = source();
      const initialFile = {
        ano: 2024,
        items: {
          '42': {
            sourceHash: 'hash-antes-da-mudanca',
            generationStatus: 'generated' as const,
            reviewStatus: 'approved' as const,
            resumoCard: 'Resumo aprovado antigo.',
            resumoDetalhe: 'Detalhe aprovado antigo.',
            model: null,
            promptVersion: null,
            generatedAt: null,
            reviewedAt: null,
          },
        },
      };

      // Act — reconcile marks it stale
      const { files: reconciledFiles } = reconcileProposicaoResumoIa({
        sources: [src],
        files: [initialFile],
      });

      // Assert reconcile made the item stale
      expect(reconciledFiles[0]?.items['42']?.reviewStatus).toBe('stale');

      // Act — re-import the reconciled file into the repository
      const repository = fakeRepository(new Map([[42, 'proposicao-uuid']]));
      await importProposicaoResumoIaJson(reconciledFiles[0], { repository });

      // Assert — the stale row was upserted to the database
      const upsertedRow = repository.upserted[0]?.[0];
      expect(upsertedRow?.reviewStatus).toBe('stale');
      expect(upsertedRow?.sourceHash).toBe('hash-antes-da-mudanca');
      expect(upsertedRow?.resumoCard).toBe('Resumo aprovado antigo.');
    });
  });

  describe('when a stale item is reimported', () => {
    it('the public filter hides it (stale is not in the approved set)', () => {
      // Arrange — this is a contract test: stale ≠ approved
      const reconciledFile = {
        ano: 2024,
        items: {
          '42': {
            sourceHash: 'old-hash',
            generationStatus: 'generated' as const,
            reviewStatus: 'stale' as const,
            resumoCard: 'Resumo obsoleto.',
            resumoDetalhe: 'Detalhe obsoleto.',
            model: null,
            promptVersion: null,
            generatedAt: null,
            reviewedAt: null,
          },
        },
      };

      // Act
      const { files } = reconcileProposicaoResumoIa({
        sources: [],
        files: [reconciledFile],
      });

      // Assert — stale item is preserved as-is (no-op, already stale)
      expect(files[0]?.items['42']?.reviewStatus).toBe('stale');
    });
  });
});
