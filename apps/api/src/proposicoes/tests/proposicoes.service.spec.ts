import type {
  ProposicaoVotacaoJoinRow,
  ProposicoesRepository,
} from '../proposicoes.repository';
import { ProposicoesService } from '../proposicoes.service';

function joinRow(
  overrides: Partial<ProposicaoVotacaoJoinRow> = {},
): ProposicaoVotacaoJoinRow {
  return {
    externalIdProposicao: 1,
    siglaTipo: 'PL',
    numero: 100,
    ano: 2024,
    ementa: 'Dispõe sobre algo',
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

function fakeRepository(
  rows: readonly ProposicaoVotacaoJoinRow[],
): ProposicoesRepository {
  return {
    loadProposicoesWithVotacoesPlenario: async () => rows,
    loadProposicaoDetalhe: async () => null,
  };
}

function createService(rows: readonly ProposicaoVotacaoJoinRow[]) {
  return new ProposicoesService(fakeRepository(rows));
}

describe('ProposicoesService.feed', () => {
  describe('when a proposicao has a classifiable plenary vote', () => {
    it('returns a card with proposicao identity and voting aggregates', async () => {
      // Arrange
      const service = createService([joinRow()]);

      // Act
      const page = await service.feed(20, 0);

      // Assert
      expect(page.total).toBe(1);
      expect(page.items).toHaveLength(1);
      expect(page.items[0]).toEqual({
        externalIdProposicao: 1,
        siglaTipo: 'PL',
        numero: 100,
        ano: 2024,
        ementa: 'Dispõe sobre algo',
        dataApresentacao: '2024-04-15T10:00:00Z',
        volumeVotacoesPlenario: 1,
        dataUltimaVotacao: '2024-05-01',
      });
    });
  });

  describe('when a proposicao has plenary votes but none is classifiable', () => {
    it('excludes it (not computavel pelo matcher)', async () => {
      // Arrange
      const computavel = joinRow({
        externalIdProposicao: 1,
        descricao: 'Aprovado o Projeto de Lei',
      });
      const naoComputavel = joinRow({
        externalIdProposicao: 2,
        descricao: 'Requerimento de retirada de pauta',
      });
      const service = createService([computavel, naoComputavel]);

      // Act
      const page = await service.feed(20, 0);

      // Assert
      expect(page.total).toBe(1);
      expect(page.items.map((item) => item.externalIdProposicao)).toEqual([1]);
    });
  });

  describe('when ranking computable proposicoes', () => {
    it('orders by volume of plenary votes descending', async () => {
      // Arrange
      const umaVotacao = joinRow({
        externalIdProposicao: 1,
        externalIdVotacao: '1-1',
        descricao: 'Aprovado o Projeto de Lei',
      });
      const duasVotacoesA = joinRow({
        externalIdProposicao: 2,
        externalIdVotacao: '2-1',
        descricao: 'Aprovado o Projeto de Lei',
      });
      const duasVotacoesB = joinRow({
        externalIdProposicao: 2,
        externalIdVotacao: '2-2',
        descricao: 'Aprovada a Medida Provisória',
      });
      const service = createService([umaVotacao, duasVotacoesA, duasVotacoesB]);

      // Act
      const page = await service.feed(20, 0);

      // Assert
      expect(page.items.map((item) => item.externalIdProposicao)).toEqual([
        2, 1,
      ]);
      expect(page.items[0].volumeVotacoesPlenario).toBe(2);
      expect(page.items[0].dataUltimaVotacao).toBe('2024-05-01');
    });

    it('breaks volume ties by ano desc, numero desc, siglaTipo asc, externalId asc', async () => {
      // Arrange
      const base = { descricao: 'Aprovado o Projeto de Lei' } as const;
      const rows = [
        joinRow({
          externalIdProposicao: 10,
          ano: 2023,
          numero: 5,
          siglaTipo: 'PL',
          externalIdVotacao: 'a',
          ...base,
        }),
        joinRow({
          externalIdProposicao: 11,
          ano: 2024,
          numero: 5,
          siglaTipo: 'PL',
          externalIdVotacao: 'b',
          ...base,
        }),
        joinRow({
          externalIdProposicao: 12,
          ano: 2024,
          numero: 9,
          siglaTipo: 'PL',
          externalIdVotacao: 'c',
          ...base,
        }),
      ];
      const service = createService(rows);

      // Act
      const page = await service.feed(20, 0);

      // Assert
      expect(page.items.map((item) => item.externalIdProposicao)).toEqual([
        12, 11, 10,
      ]);
    });
  });

  describe('pagination', () => {
    function threeComputaveis() {
      return [2024, 2023, 2022].map((ano, index) =>
        joinRow({
          externalIdProposicao: index + 1,
          ano,
          externalIdVotacao: `${index + 1}-1`,
          descricao: 'Aprovado o Projeto de Lei',
        }),
      );
    }

    it('slices by limit and offset while reporting the full total', async () => {
      // Arrange
      const service = createService(threeComputaveis());

      // Act
      const page = await service.feed(2, 1);

      // Assert
      expect(page.total).toBe(3);
      expect(page.limit).toBe(2);
      expect(page.offset).toBe(1);
      expect(page.items).toHaveLength(2);
    });

    it('returns an empty page when offset is beyond the total', async () => {
      // Arrange
      const service = createService(threeComputaveis());

      // Act
      const page = await service.feed(20, 99);

      // Assert
      expect(page.total).toBe(3);
      expect(page.items).toEqual([]);
    });
  });
});

describe('ProposicoesService.search', () => {
  describe('when searching by a word in the ementa', () => {
    it('returns the matching computavel card and echoes the query', async () => {
      // Arrange
      const service = createService([
        joinRow({
          externalIdProposicao: 1,
          ementa: 'Dispõe sobre saúde pública',
          descricao: 'Aprovado o Projeto de Lei',
        }),
        joinRow({
          externalIdProposicao: 2,
          ementa: 'Dispõe sobre educação',
          descricao: 'Aprovado o Projeto de Lei',
        }),
      ]);

      // Act
      const result = await service.search('saúde', 20, 0);

      // Assert
      expect(result.query).toBe('saúde');
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(0);
      expect(result.total).toBe(1);
      expect(result.items.map((item) => item.externalIdProposicao)).toEqual([
        1,
      ]);
    });
  });

  describe('when searching by the legislative identifier', () => {
    it.each([
      ['siglaTipo', 'PL'],
      ['numero', '1234'],
      ['ano', '2024'],
    ])('finds the proposicao by its %s', async (_field, term) => {
      // Arrange
      const service = createService([
        joinRow({
          externalIdProposicao: 7,
          siglaTipo: 'PL',
          numero: 1234,
          ano: 2024,
          ementa: 'Texto qualquer',
          descricao: 'Aprovado o Projeto de Lei',
        }),
      ]);

      // Act
      const result = await service.search(term, 20, 0);

      // Assert
      expect(result.items.map((item) => item.externalIdProposicao)).toEqual([
        7,
      ]);
    });

    it('finds the proposicao by the "tipo numero/ano" citation format', async () => {
      // Arrange
      const service = createService([
        joinRow({
          externalIdProposicao: 7,
          siglaTipo: 'PEC',
          numero: 3,
          ano: 2021,
          ementa: 'Texto qualquer',
          descricao: 'Aprovado o Projeto de Lei',
        }),
      ]);

      // Act
      const result = await service.search('PEC 3/2021', 20, 0);

      // Assert
      expect(result.items.map((item) => item.externalIdProposicao)).toEqual([
        7,
      ]);
    });
  });

  describe('when the query has multiple tokens', () => {
    it('requires every token to match (AND semantics)', async () => {
      // Arrange
      const service = createService([
        joinRow({
          externalIdProposicao: 1,
          ementa: 'Dispõe sobre saúde pública',
          descricao: 'Aprovado o Projeto de Lei',
        }),
      ]);

      // Act
      const result = await service.search('saúde educação', 20, 0);

      // Assert
      expect(result.total).toBe(0);
      expect(result.items).toEqual([]);
    });
  });

  describe('when a matching proposicao is not computavel pelo matcher', () => {
    it('excludes it even though the text matches', async () => {
      // Arrange
      const computavel = joinRow({
        externalIdProposicao: 1,
        ementa: 'Dispõe sobre saúde',
        descricao: 'Aprovado o Projeto de Lei',
      });
      const naoComputavel = joinRow({
        externalIdProposicao: 2,
        ementa: 'Dispõe sobre saúde',
        descricao: 'Requerimento de retirada de pauta',
      });
      const service = createService([computavel, naoComputavel]);

      // Act
      const result = await service.search('saúde', 20, 0);

      // Assert
      expect(result.items.map((item) => item.externalIdProposicao)).toEqual([
        1,
      ]);
    });
  });

  describe('when ranking the matches', () => {
    it('puts identifier hits before ementa-coincidence hits, then breaks ties by volume', async () => {
      // Arrange: query "pl" hits siglaTipo for two, only the ementa for one
      const ementaCoincidence = joinRow({
        externalIdProposicao: 1,
        siglaTipo: 'PEC',
        numero: 999,
        ano: 2019,
        ementa: 'Disciplina o pl orçamentário',
        externalIdVotacao: '1-1',
        descricao: 'Aprovado o Projeto de Lei',
      });
      const identifierLowVolume = joinRow({
        externalIdProposicao: 2,
        siglaTipo: 'PL',
        numero: 50,
        ano: 2024,
        ementa: 'Projeto sobre transporte',
        externalIdVotacao: '2-1',
        descricao: 'Aprovado o Projeto de Lei',
      });
      const identifierHighVolumeA = joinRow({
        externalIdProposicao: 3,
        siglaTipo: 'PL',
        numero: 51,
        ano: 2024,
        ementa: 'Projeto sobre energia',
        externalIdVotacao: '3-1',
        descricao: 'Aprovado o Projeto de Lei',
      });
      const identifierHighVolumeB = joinRow({
        externalIdProposicao: 3,
        siglaTipo: 'PL',
        numero: 51,
        ano: 2024,
        ementa: 'Projeto sobre energia',
        externalIdVotacao: '3-2',
        descricao: 'Aprovada a Medida Provisória',
      });
      const service = createService([
        ementaCoincidence,
        identifierLowVolume,
        identifierHighVolumeA,
        identifierHighVolumeB,
      ]);

      // Act
      const result = await service.search('pl', 20, 0);

      // Assert
      expect(result.items.map((item) => item.externalIdProposicao)).toEqual([
        3, 2, 1,
      ]);
    });
  });

  describe('pagination', () => {
    function fourMatches() {
      return [2024, 2023, 2022, 2021].map((ano, index) =>
        joinRow({
          externalIdProposicao: index + 1,
          ano,
          numero: index + 1,
          ementa: 'Dispõe sobre saúde',
          externalIdVotacao: `${index + 1}-1`,
          descricao: 'Aprovado o Projeto de Lei',
        }),
      );
    }

    it('slices by limit and offset while reporting the full total', async () => {
      // Arrange
      const service = createService(fourMatches());

      // Act
      const result = await service.search('saúde', 2, 1);

      // Assert
      expect(result.total).toBe(4);
      expect(result.limit).toBe(2);
      expect(result.offset).toBe(1);
      expect(result.items).toHaveLength(2);
      // ordered by ano desc, so the full ranking is [1, 2, 3, 4]
      expect(result.items.map((item) => item.externalIdProposicao)).toEqual([
        2, 3,
      ]);
    });

    it('returns an empty page when offset is beyond the total', async () => {
      // Arrange
      const service = createService(fourMatches());

      // Act
      const result = await service.search('saúde', 20, 99);

      // Assert
      expect(result.total).toBe(4);
      expect(result.items).toEqual([]);
    });
  });
});
