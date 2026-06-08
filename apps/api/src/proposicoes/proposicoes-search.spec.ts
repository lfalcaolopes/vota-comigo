import {
  matchesAllTokens,
  referenceMatchCount,
  tokenizeQuery,
  type SearchableProposicao,
} from './proposicoes-search';

function searchable(
  overrides: Partial<SearchableProposicao> = {},
): SearchableProposicao {
  return {
    ementa: 'dispoe sobre saude publica',
    siglaTipo: 'pl',
    numero: '1234',
    ano: '2024',
    ...overrides,
  };
}

describe('tokenizeQuery', () => {
  describe('when the query has words separated by whitespace', () => {
    it('splits into lowercase, accent-free tokens', () => {
      // Arrange
      const query = 'Saúde  PÚBLICA';

      // Act
      const tokens = tokenizeQuery(query);

      // Assert
      expect(tokens).toEqual(['saude', 'publica']);
    });
  });

  describe('when the query uses the "tipo numero/ano" citation format', () => {
    it('splits the numero/ano reference on the slash', () => {
      // Arrange
      const query = 'PEC 3/2021';

      // Act
      const tokens = tokenizeQuery(query);

      // Assert
      expect(tokens).toEqual(['pec', '3', '2021']);
    });
  });
});

describe('matchesAllTokens', () => {
  describe('when every token is found across the searchable fields', () => {
    it('matches with tokens spread over ementa, siglaTipo and ano', () => {
      // Arrange
      const fields = searchable();
      const tokens = tokenizeQuery('saude pl 2024');

      // Act
      const matched = matchesAllTokens(fields, tokens);

      // Assert
      expect(matched).toBe(true);
    });
  });

  describe('when at least one token is missing from every field', () => {
    it('does not match (AND semantics)', () => {
      // Arrange
      const fields = searchable();
      const tokens = tokenizeQuery('saude educacao');

      // Act
      const matched = matchesAllTokens(fields, tokens);

      // Assert
      expect(matched).toBe(false);
    });
  });
});

describe('referenceMatchCount', () => {
  describe('when tokens hit the legislative identifier fields', () => {
    it('counts tokens matching siglaTipo, numero or ano', () => {
      // Arrange
      const fields = searchable();
      const tokens = tokenizeQuery('pl 1234 2024');

      // Act
      const count = referenceMatchCount(fields, tokens);

      // Assert
      expect(count).toBe(3);
    });
  });

  describe('when a token only appears in the ementa', () => {
    it('does not count it as an identifier match', () => {
      // Arrange
      const fields = searchable();
      const tokens = tokenizeQuery('saude pl');

      // Act
      const count = referenceMatchCount(fields, tokens);

      // Assert
      expect(count).toBe(1);
    });
  });
});
