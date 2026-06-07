import { ProposicoesService } from './proposicoes.service';
import type {
  ProposicaoVotacaoJoinRow,
  ProposicoesRepository,
} from './proposicoes.repository';

function joinRow(
  overrides: Partial<ProposicaoVotacaoJoinRow> = {},
): ProposicaoVotacaoJoinRow {
  return {
    externalIdProposicao: 1,
    siglaTipo: 'PL',
    numero: 100,
    ano: 2024,
    ementa: 'Dispõe sobre algo',
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
  };
}

function createService(rows: readonly ProposicaoVotacaoJoinRow[]) {
  return new ProposicoesService(fakeRepository(rows));
}

describe('ProposicoesService.maisVotadas', () => {
  describe('when a proposicao has a classifiable plenary vote', () => {
    it('returns a card with identity, volume and the reference summary', async () => {
      // Arrange
      const service = createService([joinRow()]);

      // Act
      const page = await service.maisVotadas(20, 0);

      // Assert
      expect(page.total).toBe(1);
      expect(page.items).toHaveLength(1);
      expect(page.items[0]).toEqual({
        externalIdProposicao: 1,
        siglaTipo: 'PL',
        numero: 100,
        ano: 2024,
        ementa: 'Dispõe sobre algo',
        status: {
          siglaOrgao: 'PLEN',
          situacao: 'Aprovada',
          regime: 'Urgência',
          dataHora: '2024-06-01T10:00:00Z',
        },
        volumeVotacoesPlenario: 1,
        votacaoReferencia: {
          externalIdVotacao: '1-1',
          data: '2024-05-01',
          descricao: 'Aprovado o Projeto de Lei',
          pattern: 'projeto_de_lei',
          votosSim: 300,
          votosNao: 100,
          votosOutros: 5,
          resultado: 'aprovada',
        },
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
      const page = await service.maisVotadas(20, 0);

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
      const service = createService([
        umaVotacao,
        duasVotacoesA,
        duasVotacoesB,
      ]);

      // Act
      const page = await service.maisVotadas(20, 0);

      // Assert
      expect(page.items.map((item) => item.externalIdProposicao)).toEqual([
        2, 1,
      ]);
      expect(page.items[0].volumeVotacoesPlenario).toBe(2);
    });

    it('breaks volume ties by ano desc, numero desc, siglaTipo asc, externalId asc', async () => {
      // Arrange
      const base = { descricao: 'Aprovado o Projeto de Lei' } as const;
      const rows = [
        joinRow({ externalIdProposicao: 10, ano: 2023, numero: 5, siglaTipo: 'PL', externalIdVotacao: 'a', ...base }),
        joinRow({ externalIdProposicao: 11, ano: 2024, numero: 5, siglaTipo: 'PL', externalIdVotacao: 'b', ...base }),
        joinRow({ externalIdProposicao: 12, ano: 2024, numero: 9, siglaTipo: 'PL', externalIdVotacao: 'c', ...base }),
      ];
      const service = createService(rows);

      // Act
      const page = await service.maisVotadas(20, 0);

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
      const page = await service.maisVotadas(2, 1);

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
      const page = await service.maisVotadas(20, 99);

      // Assert
      expect(page.total).toBe(3);
      expect(page.items).toEqual([]);
    });
  });
});
