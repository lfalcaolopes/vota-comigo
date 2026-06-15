import { NotFoundException } from '@nestjs/common';

import type {
  ProposicoesFeedResponse,
  ProposicaoDetalhe,
} from '@vota-comigo/shared-types';

import { ProposicoesController } from '../proposicoes.controller';
import type { ProposicoesService } from '../proposicoes.service';

function fakeService(response: ProposicoesFeedResponse) {
  const feed = jest.fn().mockResolvedValue(response);
  const service = { feed } as unknown as ProposicoesService;
  return { service, feed };
}

function fakeDetalheService(impl: jest.Mock) {
  const service = { detalhe: impl } as unknown as ProposicoesService;
  return { service, detalhe: impl };
}

const emptyResponse: ProposicoesFeedResponse = {
  items: [],
  total: 0,
  limit: 20,
  offset: 0,
};

describe('ProposicoesController.feed', () => {
  describe('when query params are valid', () => {
    it('delegates to the service with pagination and ordenacao', async () => {
      // Arrange
      const { service, feed } = fakeService(emptyResponse);
      const controller = new ProposicoesController(service);

      // Act
      const result = await controller.feed(10, 5, 'mais-recentes');

      // Assert
      expect(feed).toHaveBeenCalledWith(
        10,
        5,
        'mais-recentes',
        undefined,
        undefined,
      );
      expect(result).toBe(emptyResponse);
    });
  });

  describe('when ordenacao is absent', () => {
    it('defaults to mais-votadas', async () => {
      // Arrange
      const { service, feed } = fakeService(emptyResponse);
      const controller = new ProposicoesController(service);

      // Act
      await controller.feed(10, 5, 'mais-votadas');

      // Assert
      expect(feed).toHaveBeenCalledWith(
        10,
        5,
        'mais-votadas',
        undefined,
        undefined,
      );
    });
  });

  describe('when query params are missing or out of range', () => {
    it('applies defaults and clamps before delegating', async () => {
      // Arrange
      const { service, feed } = fakeService(emptyResponse);
      const controller = new ProposicoesController(service);

      // Act
      await controller.feed(undefined, undefined, 'mais-votadas');
      await controller.feed(999, -3, 'mais-votadas');

      // Assert
      expect(feed).toHaveBeenNthCalledWith(
        1,
        20,
        0,
        'mais-votadas',
        undefined,
        undefined,
      );
      expect(feed).toHaveBeenNthCalledWith(
        2,
        100,
        0,
        'mais-votadas',
        undefined,
        undefined,
      );
    });
  });

  describe('when q is provided', () => {
    it('passes the trimmed q to the service and treats blank as undefined', async () => {
      // Arrange
      const { service, feed } = fakeService(emptyResponse);
      const controller = new ProposicoesController(service);

      // Act
      await controller.feed(20, 0, 'mais-votadas', undefined, '  saúde  ');
      await controller.feed(20, 0, 'mais-votadas', undefined, '   ');

      // Assert
      expect(feed).toHaveBeenNthCalledWith(
        1,
        20,
        0,
        'mais-votadas',
        undefined,
        'saúde',
      );
      expect(feed).toHaveBeenNthCalledWith(
        2,
        20,
        0,
        'mais-votadas',
        undefined,
        undefined,
      );
    });
  });
});

describe('ProposicoesController.detalhe', () => {
  const detail = {
    externalIdProposicao: 1,
    siglaTipo: 'PL',
    numero: 100,
    ano: 2024,
    ementa: 'Dispõe sobre algo',
    dataApresentacao: '2024-04-15T10:00:00Z',
    ementaDetalhada: null,
    urlInteiroTeor: null,
    status: { siglaOrgao: null, situacao: null, regime: null, dataHora: null },
    fonteOficial:
      'https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=1',
    temas: [],
    votacoes: [],
  } as unknown as ProposicaoDetalhe;

  describe('when the proposicao is computavel', () => {
    it('delegates to the service with the parsed externalId', async () => {
      // Arrange
      const { service, detalhe } = fakeDetalheService(
        jest.fn().mockResolvedValue(detail),
      );
      const controller = new ProposicoesController(service);

      // Act
      const result = await controller.detalhe(1);

      // Assert
      expect(detalhe).toHaveBeenCalledWith(1);
      expect(result).toBe(detail);
    });
  });

  describe('when the service rejects', () => {
    it('propagates the NotFoundException', async () => {
      // Arrange
      const { service } = fakeDetalheService(
        jest.fn().mockRejectedValue(new NotFoundException()),
      );
      const controller = new ProposicoesController(service);

      // Act / Assert
      await expect(controller.detalhe(999)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
