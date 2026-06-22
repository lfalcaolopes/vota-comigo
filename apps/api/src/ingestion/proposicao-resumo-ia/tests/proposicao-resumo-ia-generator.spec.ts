import {
  selectProposicaoResumoIaGenerationTargets,
  applyProposicaoResumoIaGeneration,
  type ProposicaoResumoIaGenerationResult,
} from '../generation/proposicao-resumo-ia-generator';
import {
  calculateProposicaoResumoIaSourceHash,
  type ProposicaoResumoIaSource,
} from '../../../proposicoes/rules/proposicao-resumo-ia-source';
import type { ProposicaoResumoIaJson } from '../schemas/proposicao-resumo-ia-json.schema';
import type { ResumoIaGenerationOutcome } from '../generation/openrouter-resumo-ia-client';

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
    urlInteiroTeor: null,
    ...overrides,
  };
}

function annualFile(
  overrides: Partial<ProposicaoResumoIaJson> = {},
): ProposicaoResumoIaJson {
  return { ano: 2024, items: {}, ...overrides };
}

function jsonItem(
  overrides: Partial<ProposicaoResumoIaJson['items'][string]> = {},
): ProposicaoResumoIaJson['items'][string] {
  return {
    sourceHash: 'hash',
    generationStatus: 'generated',
    reviewStatus: 'approved',
    resumoCard: 'Resumo.',
    resumoDetalhe: 'Detalhe.',
    model: 'model-x',
    promptVersion: 'v1',
    generatedAt: '2026-01-01T00:00:00Z',
    reviewedAt: '2026-01-02T00:00:00Z',
    ...overrides,
  };
}

function okOutcome(
  resumoCard = 'Resumo curto.',
  resumoDetalhe = 'Resumo detalhado.',
): ResumoIaGenerationOutcome {
  return {
    ok: true,
    response: { status: 'generated', resumoCard, resumoDetalhe },
  };
}

function insufficientOutcome(): ResumoIaGenerationOutcome {
  return {
    ok: true,
    response: {
      status: 'insufficient_source',
      resumoCard: null,
      resumoDetalhe: null,
    },
  };
}

function errorOutcome(): ResumoIaGenerationOutcome {
  return { ok: false, reason: 'network error' };
}

function result(
  src: ProposicaoResumoIaSource,
  outcome: ResumoIaGenerationOutcome,
): ProposicaoResumoIaGenerationResult {
  return { source: src, outcome };
}

const MODEL = 'test-model';
const PROMPT_VERSION = 'v1';
const GENERATED_AT = '2026-06-19T00:00:00Z';

describe('selectProposicaoResumoIaGenerationTargets', () => {
  describe('incremental mode (regenerate: false)', () => {
    it('includes source when no annual file exists for its year', () => {
      // Arrange
      const src = source();
      const files = [annualFile({ ano: 2023 })];

      // Act
      const targets = selectProposicaoResumoIaGenerationTargets({
        sources: [src],
        files,
        regenerate: false,
      });

      // Assert
      expect(targets).toContain(src);
    });

    it('includes source when no item exists in its year file', () => {
      // Arrange
      const src = source();
      const files = [annualFile({ ano: 2024, items: {} })];

      // Act
      const targets = selectProposicaoResumoIaGenerationTargets({
        sources: [src],
        files,
        regenerate: false,
      });

      // Assert
      expect(targets).toContain(src);
    });

    it('includes source when existing item has generationStatus error', () => {
      // Arrange
      const src = source();
      const files = [
        annualFile({
          ano: 2024,
          items: { '42': jsonItem({ generationStatus: 'error' }) },
        }),
      ];

      // Act
      const targets = selectProposicaoResumoIaGenerationTargets({
        sources: [src],
        files,
        regenerate: false,
      });

      // Assert
      expect(targets).toContain(src);
    });

    it.each(['generated', 'insufficient_source'] as const)(
      'skips source when existing item has generationStatus %s',
      (generationStatus) => {
        // Arrange
        const src = source();
        const files = [
          annualFile({
            ano: 2024,
            items: { '42': jsonItem({ generationStatus }) },
          }),
        ];

        // Act
        const targets = selectProposicaoResumoIaGenerationTargets({
          sources: [src],
          files,
          regenerate: false,
        });

        // Assert
        expect(targets).not.toContain(src);
      },
    );

    it.each(['approved', 'rejected', 'stale'] as const)(
      'skips source when existing item has reviewStatus %s',
      (reviewStatus) => {
        // Arrange
        const src = source();
        const files = [
          annualFile({
            ano: 2024,
            items: {
              '42': jsonItem({ generationStatus: 'generated', reviewStatus }),
            },
          }),
        ];

        // Act
        const targets = selectProposicaoResumoIaGenerationTargets({
          sources: [src],
          files,
          regenerate: false,
        });

        // Assert
        expect(targets).not.toContain(src);
      },
    );

    it('skips source with null ano (cannot be placed in an annual file)', () => {
      // Arrange
      const src = source({ ano: null });
      const files: ProposicaoResumoIaJson[] = [];

      // Act
      const targets = selectProposicaoResumoIaGenerationTargets({
        sources: [src],
        files,
        regenerate: false,
      });

      // Assert
      expect(targets).not.toContain(src);
    });
  });

  describe('only-stale mode (onlyStale: true)', () => {
    it('includes source when existing item has reviewStatus stale', () => {
      // Arrange
      const src = source();
      const files = [
        annualFile({
          ano: 2024,
          items: {
            '42': jsonItem({
              generationStatus: 'generated',
              reviewStatus: 'stale',
            }),
          },
        }),
      ];

      // Act
      const targets = selectProposicaoResumoIaGenerationTargets({
        sources: [src],
        files,
        regenerate: false,
        onlyStale: true,
      });

      // Assert
      expect(targets).toContain(src);
    });

    it.each(['approved', 'rejected', 'pending'] as const)(
      'skips source when existing item has non-stale reviewStatus %s',
      (reviewStatus) => {
        // Arrange
        const src = source();
        const files = [
          annualFile({
            ano: 2024,
            items: { '42': jsonItem({ reviewStatus }) },
          }),
        ];

        // Act
        const targets = selectProposicaoResumoIaGenerationTargets({
          sources: [src],
          files,
          regenerate: false,
          onlyStale: true,
        });

        // Assert
        expect(targets).not.toContain(src);
      },
    );

    it('skips source when no item exists in its year file', () => {
      // Arrange
      const src = source();
      const files = [annualFile({ ano: 2024, items: {} })];

      // Act
      const targets = selectProposicaoResumoIaGenerationTargets({
        sources: [src],
        files,
        regenerate: false,
        onlyStale: true,
      });

      // Assert
      expect(targets).not.toContain(src);
    });

    it('skips source with null ano', () => {
      // Arrange
      const src = source({ ano: null });

      // Act
      const targets = selectProposicaoResumoIaGenerationTargets({
        sources: [src],
        files: [],
        regenerate: false,
        onlyStale: true,
      });

      // Assert
      expect(targets).not.toContain(src);
    });
  });

  describe('regenerate mode (regenerate: true)', () => {
    it('includes all sources regardless of existing generationStatus', () => {
      // Arrange
      const src = source();
      const files = [
        annualFile({
          ano: 2024,
          items: {
            '42': jsonItem({
              generationStatus: 'generated',
              reviewStatus: 'approved',
            }),
          },
        }),
      ];

      // Act
      const targets = selectProposicaoResumoIaGenerationTargets({
        sources: [src],
        files,
        regenerate: true,
      });

      // Assert
      expect(targets).toContain(src);
    });

    it('still skips sources with null ano', () => {
      // Arrange
      const src = source({ ano: null });

      // Act
      const targets = selectProposicaoResumoIaGenerationTargets({
        sources: [src],
        files: [],
        regenerate: true,
      });

      // Assert
      expect(targets).not.toContain(src);
    });
  });
});

describe('applyProposicaoResumoIaGeneration', () => {
  describe('when a source has no existing file for its year', () => {
    it('creates a new annual file with the generated item', () => {
      // Arrange
      const src = source({ ano: 2025 });
      const results = [result(src, okOutcome())];

      // Act
      const { files } = applyProposicaoResumoIaGeneration({
        files: [],
        results,
        model: MODEL,
        promptVersion: PROMPT_VERSION,
        generatedAt: GENERATED_AT,
      });

      // Assert
      const newFile = files.find((f) => f.ano === 2025);
      expect(newFile).toBeDefined();
      expect(newFile?.items['42']).toBeDefined();
    });
  });

  describe('when a source has an existing file for its year', () => {
    it('creates the item in the existing file', () => {
      // Arrange
      const src = source({ ano: 2024 });
      const existingFile = annualFile({ ano: 2024, items: {} });
      const results = [result(src, okOutcome())];

      // Act
      const { files } = applyProposicaoResumoIaGeneration({
        files: [existingFile],
        results,
        model: MODEL,
        promptVersion: PROMPT_VERSION,
        generatedAt: GENERATED_AT,
      });

      // Assert
      const outputFile = files.find((f) => f.ano === 2024);
      expect(outputFile?.items['42']).toBeDefined();
    });

    it('returns a new file object when the file changed', () => {
      // Arrange
      const src = source({ ano: 2024 });
      const existingFile = annualFile({ ano: 2024, items: {} });
      const results = [result(src, okOutcome())];

      // Act
      const { files } = applyProposicaoResumoIaGeneration({
        files: [existingFile],
        results,
        model: MODEL,
        promptVersion: PROMPT_VERSION,
        generatedAt: GENERATED_AT,
      });

      // Assert
      expect(files.find((f) => f.ano === 2024)).not.toBe(existingFile);
    });

    it('returns the same file reference when no result touches it', () => {
      // Arrange
      const src2025 = source({ ano: 2025 });
      const existingFile2024 = annualFile({ ano: 2024, items: {} });
      const results = [result(src2025, okOutcome())];

      // Act
      const { files } = applyProposicaoResumoIaGeneration({
        files: [existingFile2024],
        results,
        model: MODEL,
        promptVersion: PROMPT_VERSION,
        generatedAt: GENERATED_AT,
      });

      // Assert
      expect(files.find((f) => f.ano === 2024)).toBe(existingFile2024);
    });
  });

  describe('outcome mapping', () => {
    it('maps generated outcome to correct item fields', () => {
      // Arrange
      const src = source();
      const expectedHash = calculateProposicaoResumoIaSourceHash(src);
      const results = [result(src, okOutcome('Card.', 'Detalhe.'))];

      // Act
      const { files, report } = applyProposicaoResumoIaGeneration({
        files: [annualFile()],
        results,
        model: MODEL,
        promptVersion: PROMPT_VERSION,
        generatedAt: GENERATED_AT,
      });

      // Assert
      const item = files[0]?.items['42'];
      expect(item?.generationStatus).toBe('generated');
      expect(item?.reviewStatus).toBe('pending');
      expect(item?.resumoCard).toBe('Card.');
      expect(item?.resumoDetalhe).toBe('Detalhe.');
      expect(item?.model).toBe(MODEL);
      expect(item?.promptVersion).toBe(PROMPT_VERSION);
      expect(item?.generatedAt).toBe(GENERATED_AT);
      expect(item?.sourceHash).toBe(expectedHash);
      expect(item?.reviewedAt).toBeNull();
      expect(report.generated).toBe(1);
    });

    it('maps insufficient_source outcome to correct item fields', () => {
      // Arrange
      const src = source();
      const results = [result(src, insufficientOutcome())];

      // Act
      const { files, report } = applyProposicaoResumoIaGeneration({
        files: [annualFile()],
        results,
        model: MODEL,
        promptVersion: PROMPT_VERSION,
        generatedAt: GENERATED_AT,
      });

      // Assert
      const item = files[0]?.items['42'];
      expect(item?.generationStatus).toBe('insufficient_source');
      expect(item?.reviewStatus).toBe('pending');
      expect(item?.resumoCard).toBeNull();
      expect(item?.resumoDetalhe).toBeNull();
      expect(report.insufficientSource).toBe(1);
    });

    it('maps network/parse error outcome to error generationStatus', () => {
      // Arrange
      const src = source();
      const results = [result(src, errorOutcome())];

      // Act
      const { files, report } = applyProposicaoResumoIaGeneration({
        files: [annualFile()],
        results,
        model: MODEL,
        promptVersion: PROMPT_VERSION,
        generatedAt: GENERATED_AT,
      });

      // Assert
      const item = files[0]?.items['42'];
      expect(item?.generationStatus).toBe('error');
      expect(item?.reviewStatus).toBe('pending');
      expect(item?.resumoCard).toBeNull();
      expect(item?.resumoDetalhe).toBeNull();
      expect(report.error).toBe(1);
    });

    it('fills model, promptVersion, generatedAt and sourceHash even for error outcomes', () => {
      // Arrange
      const src = source();
      const expectedHash = calculateProposicaoResumoIaSourceHash(src);
      const results = [result(src, errorOutcome())];

      // Act
      const { files } = applyProposicaoResumoIaGeneration({
        files: [annualFile()],
        results,
        model: MODEL,
        promptVersion: PROMPT_VERSION,
        generatedAt: GENERATED_AT,
      });

      // Assert
      const item = files[0]?.items['42'];
      expect(item?.model).toBe(MODEL);
      expect(item?.promptVersion).toBe(PROMPT_VERSION);
      expect(item?.generatedAt).toBe(GENERATED_AT);
      expect(item?.sourceHash).toBe(expectedHash);
    });
  });

  describe('report counts', () => {
    it('counts each outcome type correctly across multiple results', () => {
      // Arrange
      const src1 = source({ externalIdProposicao: 1 });
      const src2 = source({ externalIdProposicao: 2 });
      const src3 = source({ externalIdProposicao: 3 });
      const existingFile = annualFile({ items: {} });
      const results = [
        result(src1, okOutcome()),
        result(src2, insufficientOutcome()),
        result(src3, errorOutcome()),
      ];

      // Act
      const { report } = applyProposicaoResumoIaGeneration({
        files: [existingFile],
        results,
        model: MODEL,
        promptVersion: PROMPT_VERSION,
        generatedAt: GENERATED_AT,
      });

      // Assert
      expect(report.generated).toBe(1);
      expect(report.insufficientSource).toBe(1);
      expect(report.error).toBe(1);
    });

    it('returns zero counts when results is empty', () => {
      // Act
      const { report } = applyProposicaoResumoIaGeneration({
        files: [],
        results: [],
        model: MODEL,
        promptVersion: PROMPT_VERSION,
        generatedAt: GENERATED_AT,
      });

      // Assert
      expect(report.generated).toBe(0);
      expect(report.insufficientSource).toBe(0);
      expect(report.error).toBe(0);
    });
  });
});
