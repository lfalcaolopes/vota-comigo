import { NotFoundException } from '@nestjs/common';

import type {
  ProposicaoDetalheHead,
  ProposicaoDetalheResult,
  ProposicoesRepository,
  VotacaoDetalheRow,
} from '../proposicoes.repository';
import { ProposicoesService } from '../proposicoes.service';

function head(
  overrides: Partial<ProposicaoDetalheHead> = {},
): ProposicaoDetalheHead {
  return {
    externalIdProposicao: 1,
    siglaTipo: 'PL',
    numero: 100,
    ano: 2024,
    ementa: 'Dispõe sobre algo',
    dataApresentacao: '2024-04-15T10:00:00Z',
    descricaoTipo: 'Projeto de Lei',
    ementaDetalhada: 'Detalha o alcance da proposição.',
    keywords: 'Saúde, regra pública.',
    urlInteiroTeor:
      'https://www.camara.leg.br/proposicoesWeb/prop_mostrarintegra?codteor=1',
    ultimoStatusSiglaOrgao: 'PLEN',
    ultimoStatusDescricaoSituacao: 'Aprovada',
    ultimoStatusRegime: 'Urgência',
    ultimoStatusDataHora: '2024-06-01T10:00:00Z',
    votacaoReferenciaId: 'votacao-1',
    ...overrides,
  };
}

function votacaoRow(
  overrides: Partial<VotacaoDetalheRow> = {},
): VotacaoDetalheRow {
  return {
    votacaoId: 'votacao-1',
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
    votacaoVotosExternalId: '1-1',
    votacaoVotosSim: 300,
    votacaoVotosNao: 100,
    votosAbstencao: 3,
    votosObstrucao: 1,
    votosArtigo17: 1,
    votosNaoInformado: 0,
    isReferenciaMatcher: true,
    ...overrides,
  };
}

function detailResult(
  overrides: Partial<ProposicaoDetalheResult> = {},
): ProposicaoDetalheResult {
  return {
    proposicao: head(),
    resumoIa: null,
    votacoes: [votacaoRow()],
    temas: [],
    ...overrides,
  };
}

function fakeRepository(
  result: ProposicaoDetalheResult | null,
): ProposicoesRepository {
  return {
    loadProposicoesComputaveis: async () => [],
    loadProposicaoDetalhe: async () => result,
    loadProposicaoTemas: async () => [],
  };
}

function createService(result: ProposicaoDetalheResult | null) {
  return new ProposicoesService(fakeRepository(result));
}

describe('ProposicoesService.detalhe', () => {
  describe('when a computavel proposicao is requested', () => {
    it('returns the proposicao identity, status and fonte oficial', async () => {
      // Arrange
      const service = createService(detailResult());

      // Act
      const detail = await service.detalhe(1);

      // Assert
      expect(detail.externalIdProposicao).toBe(1);
      expect(detail.siglaTipo).toBe('PL');
      expect(detail.numero).toBe(100);
      expect(detail.ano).toBe(2024);
      expect(detail.ementa).toBe('Dispõe sobre algo');
      expect(detail.dataApresentacao).toBe('2024-04-15T10:00:00Z');
      expect(detail.descricaoTipo).toBe('Projeto de Lei');
      expect(detail.ementaDetalhada).toBe('Detalha o alcance da proposição.');
      expect(detail.keywords).toBe('Saúde, regra pública.');
      expect(detail.urlInteiroTeor).toBe(
        'https://www.camara.leg.br/proposicoesWeb/prop_mostrarintegra?codteor=1',
      );
      expect(detail.status).toEqual({
        siglaOrgao: 'PLEN',
        situacao: 'Aprovada',
        regime: 'Urgência',
        dataHora: '2024-06-01T10:00:00Z',
      });
      expect(detail.fonteOficial).toBe(
        'https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=1',
      );
      expect(detail.resumoIaDisponivel).toBe(false);
      expect(detail.resumoIaCard).toBeNull();
      expect(detail.resumoIaDetalhe).toBeNull();
    });

    it('keeps a null inteiro teor URL when the source has no PDF link', async () => {
      // Arrange
      const service = createService(
        detailResult({
          proposicao: head({ urlInteiroTeor: null }),
        }),
      );

      // Act
      const detail = await service.detalhe(1);

      // Assert
      expect(detail.urlInteiroTeor).toBeNull();
    });

    it('lists the linked votacao with full placar, resultado and reference mark', async () => {
      // Arrange
      const service = createService(detailResult());

      // Act
      const detail = await service.detalhe(1);

      // Assert
      expect(detail.votacoes).toEqual([
        {
          externalIdVotacao: '1-1',
          data: '2024-05-01',
          descricao: 'Aprovado o Projeto de Lei',
          placar: {
            placarCompleto: true,
            votosSim: 300,
            votosNao: 100,
            votosAbstencao: 3,
            votosObstrucao: 1,
            votosArtigo17: 1,
            votosNaoInformado: 0,
          },
          resultado: 'aprovada',
          isReferenciaMatcher: true,
        },
      ]);
    });
  });

  describe('placar', () => {
    it('falls back to the aggregated 3-bucket placar when votacao_votos is absent', async () => {
      // Arrange
      const service = createService(
        detailResult({
          votacoes: [
            votacaoRow({
              votacaoVotosExternalId: null,
              votacaoVotosSim: null,
              votacaoVotosNao: null,
              votosAbstencao: null,
              votosObstrucao: null,
              votosArtigo17: null,
              votosNaoInformado: null,
              votosSim: 280,
              votosNao: 90,
              votosOutros: 12,
            }),
          ],
        }),
      );

      // Act
      const detail = await service.detalhe(1);

      // Assert
      expect(detail.votacoes[0].placar).toEqual({
        placarCompleto: false,
        votosSim: 280,
        votosNao: 90,
        votosOutros: 12,
      });
    });
  });

  describe('temas oficiais', () => {
    it('includes the official temas when present', async () => {
      // Arrange
      const service = createService(
        detailResult({
          temas: [
            { externalCodTema: 34, tema: 'Saúde' },
            { externalCodTema: 40, tema: 'Educação' },
          ],
        }),
      );

      // Act
      const detail = await service.detalhe(1);

      // Assert
      expect(detail.temas).toEqual([
        { externalCodTema: 34, tema: 'Saúde' },
        { externalCodTema: 40, tema: 'Educação' },
      ]);
    });

    it('returns an empty list when no tema was ingested', async () => {
      // Arrange
      const service = createService(detailResult({ temas: [] }));

      // Act
      const detail = await service.detalhe(1);

      // Assert
      expect(detail.temas).toEqual([]);
    });
  });

  describe('resumo de proposicao por IA', () => {
    it('includes the approved and current resumo', async () => {
      // Arrange
      const service = createService(
        detailResult({
          resumoIa: {
            sourceHash:
              '797653f92d3a0e18947adc38b96307d1d2dc760c62650e1a3e0ee22e8c511afc',
            generationStatus: 'generated',
            reviewStatus: 'approved',
            resumoCard: 'Resumo curto aprovado.',
            resumoDetalhe: 'Resumo detalhado aprovado em linguagem acessivel.',
          },
        }),
      );

      // Act
      const detail = await service.detalhe(1);

      // Assert
      expect(detail.resumoIaDisponivel).toBe(true);
      expect(detail.resumoIaCard).toBe('Resumo curto aprovado.');
      expect(detail.resumoIaDetalhe).toBe(
        'Resumo detalhado aprovado em linguagem acessivel.',
      );
    });

    it.each([
      ['pending', 'generated'],
      ['rejected', 'generated'],
      ['stale', 'generated'],
      ['approved', 'error'],
      ['approved', 'insufficient_source'],
    ] as const)(
      'hides a resumo with reviewStatus %s and generationStatus %s',
      async (reviewStatus, generationStatus) => {
        // Arrange
        const service = createService(
          detailResult({
            resumoIa: {
              sourceHash:
                '797653f92d3a0e18947adc38b96307d1d2dc760c62650e1a3e0ee22e8c511afc',
              generationStatus,
              reviewStatus,
              resumoCard: 'Resumo curto nao publicavel.',
              resumoDetalhe: 'Resumo detalhado nao publicavel.',
            },
          }),
        );

        // Act
        const detail = await service.detalhe(1);

        // Assert
        expect(detail.resumoIaDisponivel).toBe(false);
        expect(detail.resumoIaCard).toBeNull();
        expect(detail.resumoIaDetalhe).toBeNull();
      },
    );

    it('hides a resumo approved and current without public text', async () => {
      // Arrange
      const service = createService(
        detailResult({
          resumoIa: {
            sourceHash:
              '797653f92d3a0e18947adc38b96307d1d2dc760c62650e1a3e0ee22e8c511afc',
            generationStatus: 'generated',
            reviewStatus: 'approved',
            resumoCard: null,
            resumoDetalhe: 'Resumo detalhado aprovado.',
          },
        }),
      );

      // Act
      const detail = await service.detalhe(1);

      // Assert
      expect(detail.resumoIaDisponivel).toBe(false);
      expect(detail.resumoIaCard).toBeNull();
      expect(detail.resumoIaDetalhe).toBeNull();
    });

    it('hides a resumo whose source hash is stale', async () => {
      // Arrange
      const service = createService(
        detailResult({
          resumoIa: {
            sourceHash: 'hash-antigo',
            generationStatus: 'generated',
            reviewStatus: 'approved',
            resumoCard: 'Resumo curto antigo.',
            resumoDetalhe: 'Resumo detalhado antigo.',
          },
        }),
      );

      // Act
      const detail = await service.detalhe(1);

      // Assert
      expect(detail.resumoIaDisponivel).toBe(false);
      expect(detail.resumoIaCard).toBeNull();
      expect(detail.resumoIaDetalhe).toBeNull();
    });
  });

  describe('resultado da votacao', () => {
    it.each([
      [1, 'aprovada'],
      [0, 'rejeitada'],
      [null, 'indisponivel'],
    ])(
      'interprets aprovacao %p as %s while preserving the raw placar numbers',
      async (aprovacao, resultado) => {
        // Arrange
        const service = createService(
          detailResult({
            votacoes: [votacaoRow({ aprovacao })],
          }),
        );

        // Act
        const detail = await service.detalhe(1);

        // Assert
        expect(detail.votacoes[0].resultado).toBe(resultado);
        expect(detail.votacoes[0].placar).toMatchObject({
          votosSim: 300,
          votosNao: 100,
        });
      },
    );
  });

  describe('when the proposicao has several plenary votacoes', () => {
    it('lists each one once and marks exactly one as the reference', async () => {
      // Arrange
      const projetoDeLei = votacaoRow({
        votacaoId: 'votacao-1',
        externalIdVotacao: '1-1',
        descricao: 'Aprovado o Projeto de Lei',
        isReferenciaMatcher: false,
      });
      const pecSegundoTurno = votacaoRow({
        votacaoId: 'votacao-2',
        externalIdVotacao: '1-2',
        descricao: 'Proposta de Emenda à Constituição',
        ultimaAberturaVotacaoDescricao: 'Votação em segundo turno',
        isReferenciaMatcher: true,
      });
      const requerimento = votacaoRow({
        votacaoId: 'votacao-3',
        externalIdVotacao: '1-3',
        descricao: 'Requerimento de retirada de pauta',
        isReferenciaMatcher: false,
      });
      const service = createService(
        detailResult({
          votacoes: [projetoDeLei, pecSegundoTurno, requerimento],
        }),
      );

      // Act
      const detail = await service.detalhe(1);

      // Assert
      const ids = detail.votacoes.map((votacao) => votacao.externalIdVotacao);
      expect(ids).toEqual(['1-1', '1-2', '1-3']);
      expect(new Set(ids).size).toBe(ids.length);
      const referencias = detail.votacoes.filter(
        (votacao) => votacao.isReferenciaMatcher,
      );
      expect(referencias.map((votacao) => votacao.externalIdVotacao)).toEqual([
        '1-2',
      ]);
    });
  });

  describe('when the proposicao cannot be served', () => {
    it('throws NotFound when it does not exist', async () => {
      // Arrange
      const service = createService(null);

      // Act / Assert
      await expect(service.detalhe(999)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('returns empty votacoes when the projected proposicao has no linked plenary votacao', async () => {
      // Arrange
      const service = createService(detailResult({ votacoes: [] }));

      // Act
      const detail = await service.detalhe(1);

      // Assert
      expect(detail.votacoes).toEqual([]);
    });

    it('throws NotFound when the proposicao is imported but not projected', async () => {
      // Arrange
      const service = createService(
        detailResult({
          proposicao: head({ votacaoReferenciaId: null }),
        }),
      );

      // Act / Assert
      await expect(service.detalhe(1)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
