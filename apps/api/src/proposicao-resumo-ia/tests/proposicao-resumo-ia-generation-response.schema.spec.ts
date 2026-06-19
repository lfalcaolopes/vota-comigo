import { proposicaoResumoIaGenerationResponseSchema } from '../proposicao-resumo-ia-generation-response.schema';

function response(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    status: 'generated',
    resumoCard: 'Resumo curto.',
    resumoDetalhe: 'Resumo detalhado.',
    ...overrides,
  };
}

describe('proposicaoResumoIaGenerationResponseSchema', () => {
  describe('when status is generated', () => {
    it('accepts non-null resumoCard and resumoDetalhe', () => {
      // Arrange
      const input = response();

      // Act
      const result = proposicaoResumoIaGenerationResponseSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(true);
    });

    it('rejects null resumoCard', () => {
      // Arrange
      const input = response({ resumoCard: null });

      // Act
      const result = proposicaoResumoIaGenerationResponseSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(false);
    });

    it('rejects null resumoDetalhe', () => {
      // Arrange
      const input = response({ resumoDetalhe: null });

      // Act
      const result = proposicaoResumoIaGenerationResponseSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(false);
    });

    it('rejects resumoCard above 180 characters', () => {
      // Arrange
      const input = response({ resumoCard: 'x'.repeat(181) });

      // Act
      const result = proposicaoResumoIaGenerationResponseSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(false);
    });

    it('rejects resumoDetalhe above 900 characters', () => {
      // Arrange
      const input = response({ resumoDetalhe: 'x'.repeat(901) });

      // Act
      const result = proposicaoResumoIaGenerationResponseSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(false);
    });
  });

  describe('when status is insufficient_source', () => {
    it('accepts null resumoCard and resumoDetalhe', () => {
      // Arrange
      const input = { status: 'insufficient_source', resumoCard: null, resumoDetalhe: null };

      // Act
      const result = proposicaoResumoIaGenerationResponseSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(true);
    });

    it('accepts omitted resumoCard and resumoDetalhe (defaults to null)', () => {
      // Arrange
      const input = { status: 'insufficient_source' };

      // Act
      const result = proposicaoResumoIaGenerationResponseSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.resumoCard).toBeNull();
        expect(result.data.resumoDetalhe).toBeNull();
      }
    });

    it('rejects non-null resumoCard', () => {
      // Arrange
      const input = { status: 'insufficient_source', resumoCard: 'texto', resumoDetalhe: null };

      // Act
      const result = proposicaoResumoIaGenerationResponseSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(false);
    });

    it('rejects non-null resumoDetalhe', () => {
      // Arrange
      const input = { status: 'insufficient_source', resumoCard: null, resumoDetalhe: 'texto' };

      // Act
      const result = proposicaoResumoIaGenerationResponseSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(false);
    });
  });

  describe('when status is invalid', () => {
    it('rejects status error (models cannot return error directly)', () => {
      // Arrange
      const input = response({ status: 'error' });

      // Act
      const result = proposicaoResumoIaGenerationResponseSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(false);
    });

    it('rejects unknown status', () => {
      // Arrange
      const input = response({ status: 'unknown' });

      // Act
      const result = proposicaoResumoIaGenerationResponseSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(false);
    });
  });

  describe('when input is not an object', () => {
    it('rejects a plain string', () => {
      // Act
      const result = proposicaoResumoIaGenerationResponseSchema.safeParse('texto livre');

      // Assert
      expect(result.success).toBe(false);
    });

    it('rejects null', () => {
      // Act
      const result = proposicaoResumoIaGenerationResponseSchema.safeParse(null);

      // Assert
      expect(result.success).toBe(false);
    });
  });
});
