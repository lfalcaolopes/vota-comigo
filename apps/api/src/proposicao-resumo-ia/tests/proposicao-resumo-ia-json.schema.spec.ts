import { proposicaoResumoIaJsonItemSchema } from '../proposicao-resumo-ia-json.schema';

function item(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    sourceHash: 'source-hash',
    generationStatus: 'generated',
    reviewStatus: 'pending',
    resumoCard: 'Resumo curto.',
    resumoDetalhe: 'Resumo detalhado.',
    ...overrides,
  };
}

describe('proposicaoResumoIaJsonItemSchema', () => {
  describe('when status values are known', () => {
    it.each(['generated', 'insufficient_source', 'error'])(
      'accepts generationStatus %s',
      (generationStatus) => {
        // Arrange
        const jsonItem = item({ generationStatus });

        // Act
        const result = proposicaoResumoIaJsonItemSchema.safeParse(jsonItem);

        // Assert
        expect(result.success).toBe(true);
      },
    );

    it.each(['pending', 'approved', 'rejected', 'stale'])(
      'accepts reviewStatus %s',
      (reviewStatus) => {
        // Arrange
        const jsonItem = item({ reviewStatus });

        // Act
        const result = proposicaoResumoIaJsonItemSchema.safeParse(jsonItem);

        // Assert
        expect(result.success).toBe(true);
      },
    );
  });

  describe('when status values are unknown', () => {
    it.each([
      ['generationStatus', 'queued'],
      ['reviewStatus', 'reviewing'],
    ])('rejects %s %s', (field, value) => {
      // Arrange
      const jsonItem = item({ [field]: value });

      // Act
      const result = proposicaoResumoIaJsonItemSchema.safeParse(jsonItem);

      // Assert
      expect(result.success).toBe(false);
    });
  });

  describe('when public texts exceed their limits', () => {
    it('rejects resumoCard above 180 characters', () => {
      // Arrange
      const jsonItem = item({ resumoCard: 'x'.repeat(181) });

      // Act
      const result = proposicaoResumoIaJsonItemSchema.safeParse(jsonItem);

      // Assert
      expect(result.success).toBe(false);
    });

    it('rejects resumoDetalhe above 900 characters', () => {
      // Arrange
      const jsonItem = item({ resumoDetalhe: 'x'.repeat(901) });

      // Act
      const result = proposicaoResumoIaJsonItemSchema.safeParse(jsonItem);

      // Assert
      expect(result.success).toBe(false);
    });
  });

  describe('when generation has insufficient source', () => {
    it.each([
      [
        'missing texts',
        {
          sourceHash: 'source-hash',
          generationStatus: 'insufficient_source',
          reviewStatus: 'pending',
        },
      ],
      [
        'null texts',
        item({
          generationStatus: 'insufficient_source',
          reviewStatus: 'pending',
          resumoCard: null,
          resumoDetalhe: null,
        }),
      ],
    ])('accepts %s', (_scenario, jsonItem) => {
      // Arrange
      const input = jsonItem;

      // Act
      const result = proposicaoResumoIaJsonItemSchema.safeParse(input);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.resumoCard).toBeNull();
        expect(result.data.resumoDetalhe).toBeNull();
      }
    });
  });
});
