import { resolveProposicaoResumoIaGenerateConfig } from '../proposicao-resumo-ia-generate.config';

describe('resolveProposicaoResumoIaGenerateConfig', () => {
  describe('with no arguments', () => {
    it('returns default config with no filters and regenerate false', () => {
      // Act
      const result = resolveProposicaoResumoIaGenerateConfig([]);

      // Assert
      expect(result).toEqual({
        ok: true,
        config: { year: undefined, limit: undefined, externalIdProposicao: undefined, regenerate: false },
      });
    });
  });

  describe('with --year', () => {
    it('parses a valid four-digit year', () => {
      // Act
      const result = resolveProposicaoResumoIaGenerateConfig(['--year=2023']);

      // Assert
      expect(result).toMatchObject({ ok: true, config: { year: 2023 } });
    });

    it('returns error for non-numeric year', () => {
      // Act
      const result = resolveProposicaoResumoIaGenerateConfig(['--year=abc']);

      // Assert
      expect(result.ok).toBe(false);
    });

    it('returns error for a year outside four-digit format', () => {
      // Act
      const result = resolveProposicaoResumoIaGenerateConfig(['--year=99']);

      // Assert
      expect(result.ok).toBe(false);
    });
  });

  describe('with --limit', () => {
    it('parses a positive integer limit', () => {
      // Act
      const result = resolveProposicaoResumoIaGenerateConfig(['--limit=10']);

      // Assert
      expect(result).toMatchObject({ ok: true, config: { limit: 10 } });
    });

    it('returns error for zero limit', () => {
      // Act
      const result = resolveProposicaoResumoIaGenerateConfig(['--limit=0']);

      // Assert
      expect(result.ok).toBe(false);
    });

    it('returns error for negative limit', () => {
      // Act
      const result = resolveProposicaoResumoIaGenerateConfig(['--limit=-1']);

      // Assert
      expect(result.ok).toBe(false);
    });

    it('returns error for non-integer limit', () => {
      // Act
      const result = resolveProposicaoResumoIaGenerateConfig(['--limit=abc']);

      // Assert
      expect(result.ok).toBe(false);
    });
  });

  describe('with --external-id-proposicao', () => {
    it('parses a valid positive integer', () => {
      // Act
      const result = resolveProposicaoResumoIaGenerateConfig(['--external-id-proposicao=42']);

      // Assert
      expect(result).toMatchObject({ ok: true, config: { externalIdProposicao: 42 } });
    });

    it('returns error for non-numeric value', () => {
      // Act
      const result = resolveProposicaoResumoIaGenerateConfig(['--external-id-proposicao=abc']);

      // Assert
      expect(result.ok).toBe(false);
    });
  });

  describe('with --regenerate', () => {
    it('sets regenerate to true', () => {
      // Act
      const result = resolveProposicaoResumoIaGenerateConfig(['--regenerate']);

      // Assert
      expect(result).toMatchObject({ ok: true, config: { regenerate: true } });
    });
  });

  describe('with combined flags', () => {
    it('parses all flags together', () => {
      // Act
      const result = resolveProposicaoResumoIaGenerateConfig([
        '--year=2023',
        '--limit=5',
        '--external-id-proposicao=99',
        '--regenerate',
      ]);

      // Assert
      expect(result).toEqual({
        ok: true,
        config: { year: 2023, limit: 5, externalIdProposicao: 99, regenerate: true },
      });
    });
  });
});
