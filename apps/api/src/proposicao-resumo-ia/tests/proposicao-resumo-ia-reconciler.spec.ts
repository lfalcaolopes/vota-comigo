import { reconcileProposicaoResumoIa } from '../proposicao-resumo-ia-reconciler';
import {
  calculateProposicaoResumoIaSourceHash,
  type ProposicaoResumoIaSource,
} from '../../proposicoes/rules/proposicao-resumo-ia-source';
import type { ProposicaoResumoIaJson } from '../proposicao-resumo-ia-json.schema';

function source(
  overrides: Partial<ProposicaoResumoIaSource> = {},
): ProposicaoResumoIaSource {
  return {
    externalIdProposicao: 42,
    siglaTipo: 'PL',
    numero: 100,
    ano: 2024,
    descricaoTipo: 'Projeto de Lei',
    ementa: 'Ementa base da proposição.',
    ementaDetalhada: null,
    keywords: null,
    ...overrides,
  };
}

function jsonItem(
  overrides: Partial<ProposicaoResumoIaJson['items'][string]> = {},
): ProposicaoResumoIaJson['items'][string] {
  return {
    sourceHash: 'hash-placeholder',
    generationStatus: 'generated',
    reviewStatus: 'approved',
    resumoCard: 'Resumo curto aprovado.',
    resumoDetalhe: 'Resumo detalhado aprovado.',
    model: null,
    promptVersion: null,
    generatedAt: null,
    reviewedAt: null,
    ...overrides,
  };
}

function annualFile(
  overrides: Partial<ProposicaoResumoIaJson> = {},
): ProposicaoResumoIaJson {
  return {
    ano: 2024,
    items: {},
    ...overrides,
  };
}

describe('reconcileProposicaoResumoIa', () => {
  describe('when the source hash matches the item sourceHash', () => {
    it('preserves the item and reports it as preserved', () => {
      // Arrange
      const src = source();
      const currentHash = calculateProposicaoResumoIaSourceHash(src);
      const existingItem = jsonItem({ sourceHash: currentHash });
      const existingFile = annualFile({ items: { '42': existingItem } });

      // Act
      const result = reconcileProposicaoResumoIa({
        sources: [src],
        files: [existingFile],
      });

      // Assert
      expect(result.report.preserved).toBe(1);
      expect(result.report.markedStale).toBe(0);
      expect(result.report.pendingExternalIdProposicao).toEqual([]);
      expect(result.files[0]?.items['42']).toEqual(existingItem);
    });
  });

  describe('when the source hash differs from the item sourceHash', () => {
    it('marks the item as stale, keeping the old hash and resumo texts', () => {
      // Arrange
      const src = source();
      const oldHash = 'old-hash-before-source-changed';
      const existingItem = jsonItem({
        sourceHash: oldHash,
        reviewStatus: 'approved',
        resumoCard: 'Resumo antigo curto.',
        resumoDetalhe: 'Resumo antigo detalhado.',
      });
      const existingFile = annualFile({ items: { '42': existingItem } });

      // Act
      const result = reconcileProposicaoResumoIa({
        sources: [src],
        files: [existingFile],
      });

      // Assert
      expect(result.report.markedStale).toBe(1);
      expect(result.report.preserved).toBe(0);
      const updatedItem = result.files[0]?.items['42'];
      expect(updatedItem?.reviewStatus).toBe('stale');
      expect(updatedItem?.sourceHash).toBe(oldHash);
      expect(updatedItem?.resumoCard).toBe('Resumo antigo curto.');
      expect(updatedItem?.resumoDetalhe).toBe('Resumo antigo detalhado.');
    });

    it('does not alter other metadata fields of the item', () => {
      // Arrange
      const src = source();
      const existingItem = jsonItem({
        sourceHash: 'outdated-hash',
        reviewStatus: 'approved',
        model: 'fixture-model',
        promptVersion: 'v1',
        generatedAt: '2026-01-01T00:00:00Z',
        reviewedAt: '2026-01-02T00:00:00Z',
      });
      const existingFile = annualFile({ items: { '42': existingItem } });

      // Act
      const result = reconcileProposicaoResumoIa({
        sources: [src],
        files: [existingFile],
      });

      // Assert
      const updatedItem = result.files[0]?.items['42'];
      expect(updatedItem?.model).toBe('fixture-model');
      expect(updatedItem?.promptVersion).toBe('v1');
      expect(updatedItem?.generatedAt).toBe('2026-01-01T00:00:00Z');
      expect(updatedItem?.reviewedAt).toBe('2026-01-02T00:00:00Z');
    });
  });

  describe('when there is no item in the file for a source', () => {
    it('reports the external id as pending without creating an item', () => {
      // Arrange
      const src = source({ externalIdProposicao: 99 });
      const existingFile = annualFile({ items: {} });

      // Act
      const result = reconcileProposicaoResumoIa({
        sources: [src],
        files: [existingFile],
      });

      // Assert
      expect(result.report.pendingExternalIdProposicao).toEqual([99]);
      expect(result.report.preserved).toBe(0);
      expect(result.report.markedStale).toBe(0);
      expect(result.files[0]?.items).not.toHaveProperty('99');
    });
  });

  describe('when there is no file for the source year', () => {
    it('reports the source as pending', () => {
      // Arrange
      const src = source({ externalIdProposicao: 42, ano: 2025 });
      const existingFile = annualFile({ ano: 2024, items: {} });

      // Act
      const result = reconcileProposicaoResumoIa({
        sources: [src],
        files: [existingFile],
      });

      // Assert
      expect(result.report.pendingExternalIdProposicao).toEqual([42]);
    });
  });

  describe('when a source has a null ano', () => {
    it('reports the source as pending', () => {
      // Arrange
      const src = source({ ano: null });
      const existingFile = annualFile({ items: { '42': jsonItem() } });

      // Act
      const result = reconcileProposicaoResumoIa({
        sources: [src],
        files: [existingFile],
      });

      // Assert
      expect(result.report.pendingExternalIdProposicao).toEqual([42]);
    });
  });

  describe('when an item is already stale and the hash still differs', () => {
    it('leaves the item unchanged and does not increment markedStale', () => {
      // Arrange
      const src = source();
      const existingItem = jsonItem({
        sourceHash: 'old-hash',
        reviewStatus: 'stale',
        resumoCard: 'Resumo obsoleto.',
        resumoDetalhe: 'Detalhe obsoleto.',
      });
      const existingFile = annualFile({ items: { '42': existingItem } });

      // Act
      const result = reconcileProposicaoResumoIa({
        sources: [src],
        files: [existingFile],
      });

      // Assert
      expect(result.report.markedStale).toBe(0);
      expect(result.report.preserved).toBe(0);
      const returnedItem = result.files[0]?.items['42'];
      expect(returnedItem?.reviewStatus).toBe('stale');
      expect(returnedItem?.sourceHash).toBe('old-hash');
      expect(returnedItem?.resumoCard).toBe('Resumo obsoleto.');
    });
  });

  describe('when sources span multiple years', () => {
    it('reconciles each source against the file for its year', () => {
      // Arrange
      const src2024 = source({ externalIdProposicao: 42, ano: 2024 });
      const src2025 = source({ externalIdProposicao: 43, ano: 2025 });
      const hash2024 = calculateProposicaoResumoIaSourceHash(src2024);
      const file2024 = annualFile({
        ano: 2024,
        items: { '42': jsonItem({ sourceHash: hash2024 }) },
      });
      const file2025 = annualFile({ ano: 2025, items: {} });

      // Act
      const result = reconcileProposicaoResumoIa({
        sources: [src2024, src2025],
        files: [file2024, file2025],
      });

      // Assert
      expect(result.report.proposicoesComputaveis).toBe(2);
      expect(result.report.preserved).toBe(1);
      expect(result.report.pendingExternalIdProposicao).toEqual([43]);
      expect(result.files).toHaveLength(2);
    });
  });

  describe('when multiple sources are processed', () => {
    it('counts proposicoesComputaveis as the total number of sources', () => {
      // Arrange
      const src1 = source({ externalIdProposicao: 42 });
      const src2 = source({ externalIdProposicao: 43 });
      const src3 = source({ externalIdProposicao: 44 });
      const hash1 = calculateProposicaoResumoIaSourceHash(src1);
      const existingFile = annualFile({
        items: {
          '42': jsonItem({ sourceHash: hash1 }),
          '43': jsonItem({ sourceHash: 'old-hash-43' }),
        },
      });

      // Act
      const result = reconcileProposicaoResumoIa({
        sources: [src1, src2, src3],
        files: [existingFile],
      });

      // Assert
      expect(result.report.proposicoesComputaveis).toBe(3);
      expect(result.report.preserved).toBe(1);
      expect(result.report.markedStale).toBe(1);
      expect(result.report.pendingExternalIdProposicao).toEqual([44]);
    });
  });

  describe('when a file has no changes after reconciliation', () => {
    it('returns the same file object reference', () => {
      // Arrange
      const src = source();
      const currentHash = calculateProposicaoResumoIaSourceHash(src);
      const existingFile = annualFile({
        items: { '42': jsonItem({ sourceHash: currentHash }) },
      });

      // Act
      const result = reconcileProposicaoResumoIa({
        sources: [src],
        files: [existingFile],
      });

      // Assert
      expect(result.files[0]).toBe(existingFile);
    });
  });

  describe('when a file has changes after reconciliation', () => {
    it('returns a new file object reference', () => {
      // Arrange
      const src = source();
      const existingFile = annualFile({
        items: { '42': jsonItem({ sourceHash: 'outdated-hash' }) },
      });

      // Act
      const result = reconcileProposicaoResumoIa({
        sources: [src],
        files: [existingFile],
      });

      // Assert
      expect(result.files[0]).not.toBe(existingFile);
    });
  });
});
