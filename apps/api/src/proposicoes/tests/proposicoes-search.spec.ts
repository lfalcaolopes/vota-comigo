import {
  filterProposicoesByQuery,
  matchesCitation,
  matchesAllTokens,
  parseCitation,
  referenceMatchCount,
  tokenizeQuery,
  type Citation,
  type SearchableProposicao,
} from '../rules/proposicoes-search';
import { toProposicoesComputaveis } from '../rules/proposicoes-computaveis';
import type { ProposicaoVotacaoJoinRow } from '../proposicoes.repository';

function joinRow(
  overrides: Partial<ProposicaoVotacaoJoinRow> = {},
): ProposicaoVotacaoJoinRow {
  return {
    externalIdProposicao: 1,
    siglaTipo: 'PL',
    numero: 100,
    ano: 2024,
    ementa: 'Dispõe sobre saúde pública',
    dataApresentacao: '2024-04-15T10:00:00Z',
    ultimoStatusSiglaOrgao: 'PLEN',
    ultimoStatusDescricaoSituacao: 'Aprovada',
    ultimoStatusRegime: 'Urgência',
    ultimoStatusDataHora: '2024-06-01T10:00:00Z',
    externalIdVotacao: '1-1',
    data: '2024-05-01',
    dataHoraRegistro: '2024-05-01T12:00:00Z',
    descricao: 'Aprovado o Projeto de Lei',
    ultimaAberturaVotacaoDescricao: null,
    ultimaApresentacaoProposicaoDescricao: null,
    votosSim: 300,
    votosNao: 100,
    votosOutros: 5,
    aprovacao: 1,
    ...overrides,
  };
}

function computaveis(...rows: ProposicaoVotacaoJoinRow[]) {
  return toProposicoesComputaveis(rows);
}

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

  describe('when the query is not a citation', () => {
    it.each([
      ['a single word', 'saude'],
      ['multiple alpha words', 'reforma tributaria 2021'],
      ['a single number', '1234'],
    ])('returns null for %s', (_label, query) => {
      // Arrange & Act
      const result = parseCitation(query);

      // Assert
      expect(result).toBeNull();
    });
  });
});

describe('matchesCitation', () => {
  function citationSearchable(
    overrides: Partial<SearchableProposicao> = {},
  ): SearchableProposicao {
    return {
      ementa: 'texto qualquer',
      siglaTipo: 'pec',
      numero: '3',
      ano: '2021',
      ...overrides,
    };
  }

  describe('when all citation fields are present', () => {
    it('matches when siglaTipo, numero and ano all agree', () => {
      // Arrange
      const fields = citationSearchable();
      const citation: Citation = { siglaTipo: 'pec', numero: '3', ano: '2021' };

      // Act & Assert
      expect(matchesCitation(fields, citation)).toBe(true);
    });

    it('does not match when siglaTipo differs', () => {
      // Arrange
      const fields = citationSearchable({ siglaTipo: 'pl' });
      const citation: Citation = { siglaTipo: 'pec', numero: '3', ano: '2021' };

      // Act & Assert
      expect(matchesCitation(fields, citation)).toBe(false);
    });

    it('does not match when numero differs', () => {
      // Arrange
      const fields = citationSearchable({ numero: '5' });
      const citation: Citation = { siglaTipo: 'pec', numero: '3', ano: '2021' };

      // Act & Assert
      expect(matchesCitation(fields, citation)).toBe(false);
    });

    it('does not match when ano differs', () => {
      // Arrange
      const fields = citationSearchable({ ano: '2022' });
      const citation: Citation = { siglaTipo: 'pec', numero: '3', ano: '2021' };

      // Act & Assert
      expect(matchesCitation(fields, citation)).toBe(false);
    });
  });

  describe('when siglaTipo is absent from the citation', () => {
    it('matches any siglaTipo when numero and ano agree', () => {
      // Arrange
      const fields = citationSearchable({ siglaTipo: 'pl' });
      const citation: Citation = { numero: '3', ano: '2021' };

      // Act & Assert
      expect(matchesCitation(fields, citation)).toBe(true);
    });
  });

  describe('when ano is absent from the citation', () => {
    it('matches any ano when siglaTipo and numero agree', () => {
      // Arrange
      const fields = citationSearchable({ ano: '2023' });
      const citation: Citation = { siglaTipo: 'pec', numero: '3' };

      // Act & Assert
      expect(matchesCitation(fields, citation)).toBe(true);
    });
  });
});

describe('filterProposicoesByQuery', () => {
  describe('when the query is a citation', () => {
    it('returns only the exact match, excluding ementa coincidences', () => {
      // Arrange
      const target = joinRow({
        externalIdProposicao: 10,
        siglaTipo: 'PEC',
        numero: 3,
        ano: 2021,
        ementa: 'Altera a Constituição',
        externalIdVotacao: '10-1',
      });
      const ementaCoincidence = joinRow({
        externalIdProposicao: 11,
        siglaTipo: 'PL',
        numero: 100,
        ano: 2020,
        ementa: 'Texto sobre 3 itens publicado em 2021',
        externalIdVotacao: '11-1',
      });
      const items = computaveis(target, ementaCoincidence);

      // Act
      const result = filterProposicoesByQuery(items, 'pec 3/2021');

      // Assert
      expect(result.map((r) => r.proposicao.externalIdProposicao)).toEqual([
        10,
      ]);
    });
  });

  describe('when the query is a plain text term', () => {
    it('returns items where every token matches ementa or identifier (AND)', () => {
      // Arrange
      const saude = joinRow({
        externalIdProposicao: 1,
        ementa: 'Dispõe sobre saúde pública',
        externalIdVotacao: '1-1',
      });
      const educacao = joinRow({
        externalIdProposicao: 2,
        ementa: 'Dispõe sobre educação',
        externalIdVotacao: '2-1',
      });
      const items = computaveis(saude, educacao);

      // Act
      const result = filterProposicoesByQuery(items, 'saúde');

      // Assert
      expect(result.map((r) => r.proposicao.externalIdProposicao)).toEqual([1]);
    });

    it('does not match a theme name that only appears as a category, not in the ementa or identifier', () => {
      // Arrange
      const row = joinRow({
        externalIdProposicao: 1,
        siglaTipo: 'PL',
        numero: 100,
        ano: 2024,
        ementa: 'Dispõe sobre finanças municipais',
        externalIdVotacao: '1-1',
      });
      const items = computaveis(row);

      // Act — "saúde" is a tema category name, not in this proposicao's identifier or ementa
      const result = filterProposicoesByQuery(items, 'saúde');

      // Assert
      expect(result).toHaveLength(0);
    });

    it('requires every token to match (AND semantics)', () => {
      // Arrange
      const row = joinRow({
        externalIdProposicao: 1,
        ementa: 'Dispõe sobre saúde pública',
        externalIdVotacao: '1-1',
      });
      const items = computaveis(row);

      // Act
      const result = filterProposicoesByQuery(items, 'saúde educação');

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  describe('when the query is empty or contains only separators', () => {
    it.each([
      ['empty string', ''],
      ['whitespace only', '   '],
      ['separator only', '/'],
    ])('returns all items unchanged for %s', (_label, q) => {
      // Arrange
      const row = joinRow({ externalIdVotacao: '1-1' });
      const items = computaveis(row);

      // Act
      const result = filterProposicoesByQuery(items, q);

      // Assert
      expect(result).toHaveLength(items.length);
    });
  });
});
