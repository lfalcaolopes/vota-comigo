import {
  parseCitation,
  toSearchPlan,
  tokenizeQuery,
  type Citation,
  type ProposicoesSearchPlan,
} from '../rules/proposicoes-search';

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

describe('parseCitation', () => {
  describe('when the query is "tipo numero/ano"', () => {
    it('returns siglaTipo, numero and ano', () => {
      // Arrange & Act
      const result = parseCitation('PEC 3/2021');

      // Assert
      expect(result).toEqual<Citation>({
        siglaTipo: 'pec',
        numero: '3',
        ano: '2021',
      });
    });
  });

  describe('when the query is "tipo numero" without ano', () => {
    it('returns siglaTipo and numero only', () => {
      // Arrange & Act
      const result = parseCitation('pl 1234');

      // Assert
      expect(result).toEqual<Citation>({ siglaTipo: 'pl', numero: '1234' });
    });
  });

  describe('when the query is "numero/ano" without tipo', () => {
    it('returns numero and ano only', () => {
      // Arrange & Act
      const result = parseCitation('3/2021');

      // Assert
      expect(result).toEqual<Citation>({ numero: '3', ano: '2021' });
    });
  });

  describe('when the numero has leading zeros', () => {
    it('strips leading zeros from numero', () => {
      // Arrange & Act
      const result = parseCitation('pec 03/2021');

      // Assert
      expect(result).toEqual<Citation>({
        siglaTipo: 'pec',
        numero: '3',
        ano: '2021',
      });
    });
  });

  describe('when the tipo is glued to the numero', () => {
    it('reads "PEC3/2021" as siglaTipo, numero and ano', () => {
      // Arrange & Act
      const result = parseCitation('PEC3/2021');

      // Assert
      expect(result).toEqual<Citation>({
        siglaTipo: 'pec',
        numero: '3',
        ano: '2021',
      });
    });

    it('reads "pl1234" as siglaTipo and numero', () => {
      // Arrange & Act
      const result = parseCitation('pl1234');

      // Assert
      expect(result).toEqual<Citation>({ siglaTipo: 'pl', numero: '1234' });
    });
  });

  describe('when the query is not a citation', () => {
    it.each([
      ['a single word', 'saude'],
      ['multiple alpha words', 'reforma tributaria 2021'],
      ['a single number', '1234'],
      ['a token with more than one alpha run', 'pec3a'],
      ['a token with punctuation between the runs', 'lei-14.133'],
      ['a single letter where a sigla belongs', '6x2020'],
      ['a work shift written as digits around a letter', '6x1'],
      ['an ano with fewer than four digits', 'pec 3/21'],
    ])('returns null for %s', (_label, query) => {
      // Arrange & Act
      const result = parseCitation(query);

      // Assert
      expect(result).toBeNull();
    });
  });
});

describe('toSearchPlan', () => {
  describe('when the query reads as a legislative citation', () => {
    it('plans an exact lookup by identifier, not a text match', () => {
      // Arrange & Act
      const plan = toSearchPlan('PEC 3/2021');

      // Assert
      expect(plan).toEqual<ProposicoesSearchPlan>({
        kind: 'citation',
        citation: { siglaTipo: 'pec', numero: '3', ano: '2021' },
      });
    });
  });

  describe('when the citation glues the tipo to the numero', () => {
    it('still plans an exact lookup', () => {
      // Arrange & Act
      const plan = toSearchPlan('PEC3/2021');

      // Assert
      expect(plan).toEqual<ProposicoesSearchPlan>({
        kind: 'citation',
        citation: { siglaTipo: 'pec', numero: '3', ano: '2021' },
      });
    });
  });

  describe('when the query is free text', () => {
    it('plans a token match with the normalized tokens', () => {
      // Arrange & Act
      const plan = toSearchPlan('Saúde Pública');

      // Assert
      expect(plan).toEqual<ProposicoesSearchPlan>({
        kind: 'tokens',
        tokens: ['saude', 'publica'],
      });
    });

    it('keeps a work shift like 6x1 searchable instead of reading it as a citation', () => {
      // Arrange & Act
      const plan = toSearchPlan('6x1');

      // Assert
      expect(plan).toEqual<ProposicoesSearchPlan>({
        kind: 'tokens',
        tokens: ['6x1'],
      });
    });

    it('keeps a lone number as a token match, since it is not a citation', () => {
      // Arrange & Act
      const plan = toSearchPlan('1234');

      // Assert
      expect(plan).toEqual<ProposicoesSearchPlan>({
        kind: 'tokens',
        tokens: ['1234'],
      });
    });
  });

  describe('when the query has no usable term', () => {
    it.each([
      ['empty string', ''],
      ['whitespace only', '   '],
      ['separator only', '/'],
    ])('plans no search for %s', (_label, query) => {
      // Arrange & Act
      const plan = toSearchPlan(query);

      // Assert
      expect(plan).toBeNull();
    });
  });
});
