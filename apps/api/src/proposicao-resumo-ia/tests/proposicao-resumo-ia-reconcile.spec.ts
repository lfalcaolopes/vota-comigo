import path from 'node:path';
import { executeProposicaoResumoIaReconcile } from '../proposicao-resumo-ia-reconcile';
import {
  calculateProposicaoResumoIaSourceHash,
  type ProposicaoResumoIaSource,
} from '../../proposicoes/rules/proposicao-resumo-ia-source';
import type { ProposicaoResumoIaRepository } from '../proposicao-resumo-ia.repository.types';

function source(
  overrides: Partial<ProposicaoResumoIaSource> = {},
): ProposicaoResumoIaSource {
  return {
    externalIdProposicao: 42,
    siglaTipo: 'PL',
    numero: 100,
    ano: 2024,
    descricaoTipo: 'Projeto de Lei',
    ementa: 'Ementa base.',
    ementaDetalhada: null,
    keywords: null,
    ...overrides,
  };
}

function fakeRepository(
  sources: readonly ProposicaoResumoIaSource[],
): ProposicaoResumoIaRepository {
  return {
    async resolveProposicaoIds() {
      return new Map();
    },
    async upsert() {
      return { inserted: 0, updated: 0 };
    },
    async loadProposicoesComputaveisSources() {
      return sources;
    },
  };
}

function validJson(ano: number, items: Record<string, unknown>): string {
  return JSON.stringify({ ano, items });
}

function item(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    sourceHash: 'source-hash',
    generationStatus: 'generated',
    reviewStatus: 'approved',
    resumoCard: 'Resumo curto.',
    resumoDetalhe: 'Resumo detalhado.',
    ...overrides,
  };
}

describe('executeProposicaoResumoIaReconcile', () => {
  describe('when all source hashes match existing items', () => {
    it('logs the report, writes no files, and exits with code 0', async () => {
      // Arrange
      const src = source();
      const currentHash = calculateProposicaoResumoIaSourceHash(src);
      const repository = fakeRepository([src]);
      const files = new Map([
        ['2024.json', validJson(2024, { '42': item({ sourceHash: currentHash }) })],
      ]);
      const written = new Map<string, string>();
      const logs: string[] = [];

      // Act
      const result = await executeProposicaoResumoIaReconcile([], {
        repository,
        async readdir() {
          return ['2024.json'];
        },
        async readFile(filePath) {
          const name = path.basename(filePath);
          return files.get(name) ?? (() => { throw new Error(`missing ${filePath}`); })();
        },
        async writeFile(filePath, content) {
          written.set(path.basename(filePath), content);
        },
        reporter: { log: (msg) => logs.push(msg) },
      });

      // Assert
      expect(result).toEqual({ ok: true, exitCode: 0, message: 'Reconciliação de resumos concluída.' });
      expect(written).toHaveProperty('size', 0);
      expect(logs).toEqual([
        'Proposições computáveis: 1',
        'Preservados: 1',
        'Marcados stale: 0',
        'Pendentes: 0',
        'Arquivos escritos: 0',
      ]);
    });
  });

  describe('when a source hash changed', () => {
    it('marks the item stale, writes the updated file, and exits with code 0', async () => {
      // Arrange
      const src = source();
      const repository = fakeRepository([src]);
      const files = new Map([
        ['2024.json', validJson(2024, { '42': item({ sourceHash: 'old-hash' }) })],
      ]);
      const written = new Map<string, string>();
      const logs: string[] = [];

      // Act
      const result = await executeProposicaoResumoIaReconcile([], {
        repository,
        async readdir() {
          return ['2024.json'];
        },
        async readFile(filePath) {
          const name = path.basename(filePath);
          return files.get(name) ?? (() => { throw new Error(`missing ${filePath}`); })();
        },
        async writeFile(filePath, content) {
          written.set(path.basename(filePath), content);
        },
        reporter: { log: (msg) => logs.push(msg) },
      });

      // Assert
      expect(result).toEqual({ ok: true, exitCode: 0, message: 'Reconciliação de resumos concluída.' });
      expect(written.has('2024.json')).toBe(true);
      const writtenJson = JSON.parse(written.get('2024.json')!) as { items: { '42': { reviewStatus: string } } };
      expect(writtenJson.items['42']?.reviewStatus).toBe('stale');
      expect(logs).toEqual([
        'Proposições computáveis: 1',
        'Preservados: 0',
        'Marcados stale: 1',
        'Pendentes: 0',
        'Arquivos escritos: 1',
      ]);
    });
  });

  describe('when a source has no corresponding JSON item', () => {
    it('reports it as pending and exits with code 1', async () => {
      // Arrange
      const src = source({ externalIdProposicao: 99 });
      const repository = fakeRepository([src]);
      const files = new Map([['2024.json', validJson(2024, {})]]);
      const written = new Map<string, string>();
      const logs: string[] = [];

      // Act
      const result = await executeProposicaoResumoIaReconcile([], {
        repository,
        async readdir() {
          return ['2024.json'];
        },
        async readFile(filePath) {
          return files.get(path.basename(filePath)) ?? (() => { throw new Error(`missing ${filePath}`); })();
        },
        async writeFile(filePath, content) {
          written.set(path.basename(filePath), content);
        },
        reporter: { log: (msg) => logs.push(msg) },
      });

      // Assert
      expect(result).toEqual({ ok: true, exitCode: 1, message: 'Reconciliação de resumos concluída.' });
      expect(written).toHaveProperty('size', 0);
      expect(logs).toContain('Pendentes: 1');
      expect(logs).toContain('Proposições sem item no JSON: 99');
    });
  });

  describe('when no JSON files exist in the directory', () => {
    it('reports all sources as pending and exits with code 1', async () => {
      // Arrange
      const src = source();
      const repository = fakeRepository([src]);
      const logs: string[] = [];

      // Act
      const result = await executeProposicaoResumoIaReconcile([], {
        repository,
        async readdir() {
          return [];
        },
        async readFile() {
          throw new Error('should not be called');
        },
        async writeFile() {
          throw new Error('should not be called');
        },
        reporter: { log: (msg) => logs.push(msg) },
      });

      // Assert
      expect(result.exitCode).toBe(1);
      expect(logs).toContain('Pendentes: 1');
    });
  });

  describe('when a JSON file is invalid', () => {
    it('returns a failure result without writing any files', async () => {
      // Arrange
      const src = source();
      const repository = fakeRepository([src]);
      const written = new Map<string, string>();
      const logs: string[] = [];

      // Act
      const result = await executeProposicaoResumoIaReconcile([], {
        repository,
        async readdir() {
          return ['2024.json'];
        },
        async readFile() {
          return JSON.stringify({ ano: 2024, items: { '42': { sourceHash: '', generationStatus: 'generated', reviewStatus: 'approved' } } });
        },
        async writeFile(filePath, content) {
          written.set(path.basename(filePath), content);
        },
        reporter: { log: (msg) => logs.push(msg) },
      });

      // Assert
      expect(result.ok).toBe(false);
      expect(result.exitCode).toBe(1);
      expect(written).toHaveProperty('size', 0);
      expect(logs).toEqual([]);
    });
  });

  describe('when only some files need to be updated', () => {
    it('writes only the changed files', async () => {
      // Arrange
      const src2024 = source({ externalIdProposicao: 42, ano: 2024 });
      const src2025 = source({ externalIdProposicao: 43, ano: 2025 });
      const hash2025 = calculateProposicaoResumoIaSourceHash(src2025);
      const repository = fakeRepository([src2024, src2025]);
      const files = new Map([
        ['2024.json', validJson(2024, { '42': item({ sourceHash: 'old-hash-42' }) })],
        ['2025.json', validJson(2025, { '43': item({ sourceHash: hash2025 }) })],
      ]);
      const written = new Map<string, string>();

      // Act
      await executeProposicaoResumoIaReconcile([], {
        repository,
        async readdir() {
          return ['2024.json', '2025.json'];
        },
        async readFile(filePath) {
          return files.get(path.basename(filePath)) ?? (() => { throw new Error(`missing ${filePath}`); })();
        },
        async writeFile(filePath, content) {
          written.set(path.basename(filePath), content);
        },
        reporter: { log: () => {} },
      });

      // Assert
      expect(written.has('2024.json')).toBe(true);
      expect(written.has('2025.json')).toBe(false);
    });
  });
});
