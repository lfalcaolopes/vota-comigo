import {
  calculateProposicaoEmbeddingSourceHash,
  toProposicaoEmbeddingText,
  type ProposicaoEmbeddingSource,
} from '../rules/proposicao-embedding-source';

const MODEL = 'openai/text-embedding-3-small';

function buildSource(
  overrides: Partial<ProposicaoEmbeddingSource> = {},
): ProposicaoEmbeddingSource {
  return {
    ementa: 'Institui o piso salarial da enfermagem.',
    keywords: 'Saúde, Salário',
    resumoIa: {
      generationStatus: 'generated',
      reviewStatus: 'approved',
      resumoCard: 'Cria um piso de remuneração.',
      resumoDetalhe: 'O texto fixa remuneração mínima para a categoria.',
    },
    ...overrides,
  };
}

describe('toProposicaoEmbeddingText', () => {
  describe('when the proposicao has an approved resumo', () => {
    it('joins ementa, keywords and both resumo texts', () => {
      // Arrange
      const source = buildSource();

      // Act
      const text = toProposicaoEmbeddingText(source);

      // Assert
      expect(text).toBe(
        [
          'Institui o piso salarial da enfermagem.',
          'Saúde, Salário',
          'Cria um piso de remuneração.',
          'O texto fixa remuneração mínima para a categoria.',
        ].join('\n'),
      );
    });

    it('keeps accents, since the embedding reads natural text', () => {
      // Arrange
      const source = buildSource();

      // Act
      const text = toProposicaoEmbeddingText(source);

      // Assert
      expect(text).toContain('Saúde');
      expect(text).toContain('remuneração');
    });
  });

  describe('when the resumo is not public', () => {
    it.each([
      ['review is pending', { reviewStatus: 'pending' as const }],
      ['generation failed', { generationStatus: 'error' as const }],
      ['the card is missing', { resumoCard: null }],
    ])('leaves the resumo out because %s', (_label, resumoOverrides) => {
      // Arrange
      const base = buildSource();
      const source = buildSource({
        resumoIa: { ...base.resumoIa!, ...resumoOverrides },
      });

      // Act
      const text = toProposicaoEmbeddingText(source);

      // Assert
      expect(text).toBe(
        'Institui o piso salarial da enfermagem.\nSaúde, Salário',
      );
    });
  });

  describe('when the proposicao has no resumo at all', () => {
    it('embeds only ementa and keywords', () => {
      // Arrange
      const source = buildSource({ resumoIa: null });

      // Act
      const text = toProposicaoEmbeddingText(source);

      // Assert
      expect(text).toBe(
        'Institui o piso salarial da enfermagem.\nSaúde, Salário',
      );
    });
  });

  describe('when a field is absent or blank', () => {
    it('skips it instead of leaving an empty line', () => {
      // Arrange
      const source = buildSource({ ementa: null, keywords: '   ' });

      // Act
      const text = toProposicaoEmbeddingText(source);

      // Assert
      expect(text).toBe(
        'Cria um piso de remuneração.\nO texto fixa remuneração mínima para a categoria.',
      );
    });
  });

  describe('when a field carries irregular whitespace', () => {
    it('collapses it so formatting alone does not change the text', () => {
      // Arrange
      const source = buildSource({
        ementa: '  Institui   o piso\n\tsalarial da enfermagem.  ',
        keywords: null,
        resumoIa: null,
      });

      // Act
      const text = toProposicaoEmbeddingText(source);

      // Assert
      expect(text).toBe('Institui o piso salarial da enfermagem.');
    });
  });
});

describe('calculateProposicaoEmbeddingSourceHash', () => {
  describe('when the embedded text and the model are the same', () => {
    it('returns the same hash', () => {
      // Arrange
      const source = buildSource();

      // Act
      const hash = calculateProposicaoEmbeddingSourceHash(source, MODEL);

      // Assert
      expect(hash).toBe(calculateProposicaoEmbeddingSourceHash(source, MODEL));
    });

    it('ignores whitespace that the embedded text collapses', () => {
      // Arrange
      const source = buildSource();
      const reformatted = buildSource({
        ementa: 'Institui  o piso salarial\nda enfermagem.',
      });

      // Act
      const hash = calculateProposicaoEmbeddingSourceHash(source, MODEL);

      // Assert
      expect(hash).toBe(
        calculateProposicaoEmbeddingSourceHash(reformatted, MODEL),
      );
    });
  });

  describe('when the resumo changes', () => {
    it('changes the hash, so a reapproved resumo is embedded again', () => {
      // Arrange
      const base = buildSource();
      const revised = buildSource({
        resumoIa: { ...base.resumoIa!, resumoDetalhe: 'Texto revisado.' },
      });

      // Act
      const hash = calculateProposicaoEmbeddingSourceHash(base, MODEL);

      // Assert
      expect(hash).not.toBe(
        calculateProposicaoEmbeddingSourceHash(revised, MODEL),
      );
    });

    it('changes the hash when approval is revoked', () => {
      // Arrange
      const base = buildSource();
      const revoked = buildSource({
        resumoIa: { ...base.resumoIa!, reviewStatus: 'rejected' },
      });

      // Act
      const hash = calculateProposicaoEmbeddingSourceHash(base, MODEL);

      // Assert
      expect(hash).not.toBe(
        calculateProposicaoEmbeddingSourceHash(revoked, MODEL),
      );
    });
  });

  describe('when the model changes', () => {
    it('changes the hash, so switching models invalidates every row', () => {
      // Arrange
      const source = buildSource();

      // Act
      const hash = calculateProposicaoEmbeddingSourceHash(source, MODEL);

      // Assert
      expect(hash).not.toBe(
        calculateProposicaoEmbeddingSourceHash(source, 'outro/modelo'),
      );
    });
  });
});
