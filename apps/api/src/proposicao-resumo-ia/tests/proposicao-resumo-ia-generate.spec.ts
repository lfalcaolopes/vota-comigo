import path from 'node:path';
import { executeProposicaoResumoIaGenerate } from '../proposicao-resumo-ia-generate';
import type { ProposicaoResumoIaSource } from '../../proposicoes/rules/proposicao-resumo-ia-source';
import type { ProposicaoResumoIaRepository } from '../proposicao-resumo-ia.repository.types';
import type { ResumoIaGenerationClient, ResumoIaGenerationOutcome } from '../openrouter-resumo-ia-client';

const GENERATED_DIR = 'data/generated/proposicao-resumos';

function source(overrides: Partial<ProposicaoResumoIaSource> = {}): ProposicaoResumoIaSource {
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

function fakeRepository(sources: readonly ProposicaoResumoIaSource[]): ProposicaoResumoIaRepository {
  return {
    async resolveProposicaoIds() { return new Map(); },
    async upsert() { return { inserted: 0, updated: 0 }; },
    async loadProposicoesComputaveisSources() { return sources; },
  };
}

function fakeAiClient(outcome: ResumoIaGenerationOutcome): ResumoIaGenerationClient {
  return { async generate() { return outcome; } };
}

function okOutcome(): ResumoIaGenerationOutcome {
  return { ok: true, response: { status: 'generated', resumoCard: 'Card.', resumoDetalhe: 'Detalhe.' } };
}

function insufficientOutcome(): ResumoIaGenerationOutcome {
  return { ok: true, response: { status: 'insufficient_source', resumoCard: null, resumoDetalhe: null } };
}

function errorOutcome(): ResumoIaGenerationOutcome {
  return { ok: false, reason: 'connection refused' };
}

function makeFileSystem(existingFiles: Map<string, string> = new Map()) {
  const written = new Map<string, string>();
  const createdDirs = new Set<string>();
  return {
    written,
    createdDirs,
    async readdir(dir: string): Promise<readonly string[]> {
      const prefix = dir + '/';
      const names: string[] = [];
      for (const key of existingFiles.keys()) {
        if (key.startsWith(prefix)) names.push(path.basename(key));
      }
      return names;
    },
    async readFile(filePath: string): Promise<string> {
      const content = existingFiles.get(filePath);
      if (content === undefined) throw Object.assign(new Error(`missing ${filePath}`), { code: 'ENOENT' });
      return content;
    },
    async writeFile(filePath: string, content: string): Promise<void> {
      written.set(filePath, content);
    },
    async mkdir(_dir: string): Promise<void> {
      createdDirs.add(_dir);
    },
  };
}

function baseOptions(
  sources: readonly ProposicaoResumoIaSource[],
  outcome: ResumoIaGenerationOutcome,
  fs: ReturnType<typeof makeFileSystem>,
  logs: string[] = [],
) {
  return {
    repository: fakeRepository(sources),
    aiClient: fakeAiClient(outcome),
    readdir: fs.readdir.bind(fs),
    readFile: fs.readFile.bind(fs),
    writeFile: fs.writeFile.bind(fs),
    mkdir: fs.mkdir.bind(fs),
    reporter: { log: (m: string) => logs.push(m) },
  };
}

describe('executeProposicaoResumoIaGenerate', () => {
  beforeEach(() => {
    process.env['OPENROUTER_MODEL'] = 'test-model';
  });

  afterEach(() => {
    delete process.env['OPENROUTER_MODEL'];
  });

  describe('with invalid config args', () => {
    it('returns ok:false with exit code 1 for invalid --limit', async () => {
      // Arrange
      const fs = makeFileSystem();

      // Act
      const result = await executeProposicaoResumoIaGenerate(
        ['--limit=0'],
        baseOptions([], okOutcome(), fs),
      );

      // Assert
      expect(result.ok).toBe(false);
      expect(result.exitCode).toBe(1);
    });
  });

  describe('when OPENROUTER_MODEL is missing and no aiClient is injected', () => {
    it('returns ok:false with exit code 1', async () => {
      // Arrange
      delete process.env['OPENROUTER_MODEL'];
      delete process.env['OPENROUTER_API_KEY'];
      const fs = makeFileSystem();

      // Act
      const result = await executeProposicaoResumoIaGenerate([], {
        repository: fakeRepository([source()]),
        readdir: fs.readdir.bind(fs),
        readFile: fs.readFile.bind(fs),
        writeFile: fs.writeFile.bind(fs),
        mkdir: fs.mkdir.bind(fs),
      });

      // Assert
      expect(result.ok).toBe(false);
      expect(result.exitCode).toBe(1);
    });
  });

  describe('with no sources', () => {
    it('exits with code 0 and writes no files', async () => {
      // Arrange
      const fs = makeFileSystem();
      const logs: string[] = [];

      // Act
      const result = await executeProposicaoResumoIaGenerate(
        [],
        baseOptions([], okOutcome(), fs, logs),
      );

      // Assert
      expect(result).toEqual({ ok: true, exitCode: 0, message: 'Geração de resumos concluída.' });
      expect(fs.written).toHaveProperty('size', 0);
    });
  });

  describe('with sources and no existing JSON files', () => {
    it('generates for all sources and creates a new annual file', async () => {
      // Arrange
      const src = source();
      const fs = makeFileSystem();

      // Act
      const result = await executeProposicaoResumoIaGenerate(
        [],
        baseOptions([src], okOutcome(), fs),
      );

      // Assert
      expect(result).toEqual({ ok: true, exitCode: 0, message: 'Geração de resumos concluída.' });
      expect(fs.written.size).toBe(1);
      const writtenPath = path.join(GENERATED_DIR, '2024.json');
      expect(fs.written.has(writtenPath)).toBe(true);
      const writtenContent = JSON.parse(fs.written.get(writtenPath)!) as { items: { '42': { generationStatus: string } } };
      expect(writtenContent.items['42']?.generationStatus).toBe('generated');
    });

    it('creates the output directory', async () => {
      // Arrange
      const fs = makeFileSystem();

      // Act
      await executeProposicaoResumoIaGenerate([], baseOptions([source()], okOutcome(), fs));

      // Assert
      expect(fs.createdDirs.has(GENERATED_DIR)).toBe(true);
    });
  });

  describe('incremental behaviour', () => {
    it('skips sources whose existing item is not error', async () => {
      // Arrange
      const src = source();
      const existingItem = {
        sourceHash: 'any',
        generationStatus: 'generated',
        reviewStatus: 'approved',
        resumoCard: 'Old.',
        resumoDetalhe: 'Old.',
        model: 'm',
        promptVersion: 'v1',
        generatedAt: '2026-01-01T00:00:00Z',
        reviewedAt: null,
      };
      const existingJson = JSON.stringify({ ano: 2024, items: { '42': existingItem } });
      const fs = makeFileSystem(new Map([[path.join(GENERATED_DIR, '2024.json'), existingJson]]));

      // Act
      await executeProposicaoResumoIaGenerate([], baseOptions([src], okOutcome(), fs));

      // Assert
      expect(fs.written).toHaveProperty('size', 0);
    });

    it('retries sources whose existing item has generationStatus error', async () => {
      // Arrange
      const src = source();
      const errorItem = {
        sourceHash: 'any',
        generationStatus: 'error',
        reviewStatus: 'pending',
        resumoCard: null,
        resumoDetalhe: null,
        model: 'm',
        promptVersion: 'v1',
        generatedAt: '2026-01-01T00:00:00Z',
        reviewedAt: null,
      };
      const existingJson = JSON.stringify({ ano: 2024, items: { '42': errorItem } });
      const fs = makeFileSystem(new Map([[path.join(GENERATED_DIR, '2024.json'), existingJson]]));

      // Act
      await executeProposicaoResumoIaGenerate([], baseOptions([src], okOutcome(), fs));

      // Assert
      expect(fs.written.size).toBeGreaterThan(0);
      const writtenContent = JSON.parse(fs.written.get(path.join(GENERATED_DIR, '2024.json'))!) as { items: { '42': { generationStatus: string } } };
      expect(writtenContent.items['42']?.generationStatus).toBe('generated');
    });
  });

  describe('with --regenerate flag', () => {
    it('reprocesses items regardless of their existing generationStatus', async () => {
      // Arrange
      const src = source();
      const approvedItem = {
        sourceHash: 'any',
        generationStatus: 'generated',
        reviewStatus: 'approved',
        resumoCard: 'Old.',
        resumoDetalhe: 'Old.',
        model: 'm',
        promptVersion: 'v1',
        generatedAt: '2026-01-01T00:00:00Z',
        reviewedAt: '2026-01-02T00:00:00Z',
      };
      const existingJson = JSON.stringify({ ano: 2024, items: { '42': approvedItem } });
      const fs = makeFileSystem(new Map([[path.join(GENERATED_DIR, '2024.json'), existingJson]]));

      // Act
      await executeProposicaoResumoIaGenerate(['--regenerate'], baseOptions([src], okOutcome(), fs));

      // Assert
      expect(fs.written.size).toBeGreaterThan(0);
      const writtenContent = JSON.parse(fs.written.get(path.join(GENERATED_DIR, '2024.json'))!) as { items: { '42': { reviewStatus: string } } };
      expect(writtenContent.items['42']?.reviewStatus).toBe('pending');
    });
  });

  describe('with --year filter', () => {
    it('only generates for sources matching the given year', async () => {
      // Arrange
      const src2024 = source({ externalIdProposicao: 42, ano: 2024 });
      const src2025 = source({ externalIdProposicao: 43, ano: 2025 });
      const aiClient = { generate: jest.fn().mockResolvedValue(okOutcome()) };
      const fs = makeFileSystem();

      // Act
      await executeProposicaoResumoIaGenerate(['--year=2024'], {
        repository: fakeRepository([src2024, src2025]),
        aiClient,
        readdir: fs.readdir.bind(fs),
        readFile: fs.readFile.bind(fs),
        writeFile: fs.writeFile.bind(fs),
        mkdir: fs.mkdir.bind(fs),
      });

      // Assert
      expect(aiClient.generate).toHaveBeenCalledTimes(1);
      expect(aiClient.generate).toHaveBeenCalledWith(src2024);
    });
  });

  describe('with --limit filter', () => {
    it('generates for at most the given number of sources', async () => {
      // Arrange
      const sources = [1, 2, 3, 4, 5].map((id) => source({ externalIdProposicao: id }));
      const aiClient = { generate: jest.fn().mockResolvedValue(okOutcome()) };
      const fs = makeFileSystem();

      // Act
      await executeProposicaoResumoIaGenerate(['--limit=2'], {
        repository: fakeRepository(sources),
        aiClient,
        readdir: fs.readdir.bind(fs),
        readFile: fs.readFile.bind(fs),
        writeFile: fs.writeFile.bind(fs),
        mkdir: fs.mkdir.bind(fs),
      });

      // Assert
      expect(aiClient.generate).toHaveBeenCalledTimes(2);
    });
  });

  describe('with --external-id-proposicao filter', () => {
    it('generates only for the specified proposicao', async () => {
      // Arrange
      const src42 = source({ externalIdProposicao: 42 });
      const src99 = source({ externalIdProposicao: 99 });
      const aiClient = { generate: jest.fn().mockResolvedValue(okOutcome()) };
      const fs = makeFileSystem();

      // Act
      await executeProposicaoResumoIaGenerate(['--external-id-proposicao=42'], {
        repository: fakeRepository([src42, src99]),
        aiClient,
        readdir: fs.readdir.bind(fs),
        readFile: fs.readFile.bind(fs),
        writeFile: fs.writeFile.bind(fs),
        mkdir: fs.mkdir.bind(fs),
      });

      // Assert
      expect(aiClient.generate).toHaveBeenCalledTimes(1);
      expect(aiClient.generate).toHaveBeenCalledWith(src42);
    });
  });

  describe('when AI client returns insufficient_source', () => {
    it('writes item with generationStatus insufficient_source', async () => {
      // Arrange
      const src = source();
      const fs = makeFileSystem();

      // Act
      await executeProposicaoResumoIaGenerate([], baseOptions([src], insufficientOutcome(), fs));

      // Assert
      const writtenPath = path.join(GENERATED_DIR, '2024.json');
      const content = JSON.parse(fs.written.get(writtenPath)!) as { items: { '42': { generationStatus: string } } };
      expect(content.items['42']?.generationStatus).toBe('insufficient_source');
    });
  });

  describe('when AI client returns an error', () => {
    it('writes item with generationStatus error', async () => {
      // Arrange
      const src = source();
      const fs = makeFileSystem();

      // Act
      await executeProposicaoResumoIaGenerate([], baseOptions([src], errorOutcome(), fs));

      // Assert
      const writtenPath = path.join(GENERATED_DIR, '2024.json');
      const content = JSON.parse(fs.written.get(writtenPath)!) as { items: { '42': { generationStatus: string } } };
      expect(content.items['42']?.generationStatus).toBe('error');
    });

    it('still exits with code 0 (errors are recorded, not fatal)', async () => {
      // Arrange
      const src = source();
      const fs = makeFileSystem();

      // Act
      const result = await executeProposicaoResumoIaGenerate([], baseOptions([src], errorOutcome(), fs));

      // Assert
      expect(result.exitCode).toBe(0);
    });
  });

  describe('when an existing JSON file is invalid', () => {
    it('returns ok:false with exit code 1', async () => {
      // Arrange
      const invalidJson = '{ "ano": 2024, "items": { "42": {} } }';
      const fs = makeFileSystem(new Map([[path.join(GENERATED_DIR, '2024.json'), invalidJson]]));

      // Act
      const result = await executeProposicaoResumoIaGenerate(
        [],
        baseOptions([source()], okOutcome(), fs),
      );

      // Assert
      expect(result.ok).toBe(false);
      expect(result.exitCode).toBe(1);
    });
  });

  describe('logging', () => {
    it('logs the report after generation', async () => {
      // Arrange
      const src = source();
      const fs = makeFileSystem();
      const logs: string[] = [];

      // Act
      await executeProposicaoResumoIaGenerate([], baseOptions([src], okOutcome(), fs, logs));

      // Assert
      expect(logs.some((l) => l.includes('Gerados'))).toBe(true);
      expect(logs.some((l) => l.includes('Arquivos escritos'))).toBe(true);
    });
  });
});
