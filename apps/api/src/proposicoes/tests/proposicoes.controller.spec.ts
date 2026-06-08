import { BadRequestException } from '@nestjs/common';

import type {
  MaisVotadasResponse,
  ProposicoesSearchResponse,
} from '@vota-comigo/shared-types';

import { ProposicoesController } from '../proposicoes.controller';
import type { ProposicoesService } from '../proposicoes.service';

function fakeService(response: MaisVotadasResponse) {
  const maisVotadas = jest.fn().mockResolvedValue(response);
  const service = { maisVotadas } as unknown as ProposicoesService;
  return { service, maisVotadas };
}

function fakeSearchService(response: ProposicoesSearchResponse) {
  const search = jest.fn().mockResolvedValue(response);
  const service = { search } as unknown as ProposicoesService;
  return { service, search };
}

const emptyResponse: MaisVotadasResponse = {
  items: [],
  total: 0,
  limit: 20,
  offset: 0,
};

const emptySearchResponse: ProposicoesSearchResponse = {
  items: [],
  total: 0,
  limit: 20,
  offset: 0,
  query: 'saude',
};

describe('ProposicoesController.maisVotadas', () => {
  describe('when query params are valid', () => {
    it('delegates to the service with the parsed pagination', async () => {
      // Arrange
      const { service, maisVotadas } = fakeService(emptyResponse);
      const controller = new ProposicoesController(service);

      // Act
      const result = await controller.maisVotadas(10, 5);

      // Assert
      expect(maisVotadas).toHaveBeenCalledWith(10, 5);
      expect(result).toBe(emptyResponse);
    });
  });

  describe('when query params are missing or out of range', () => {
    it('applies defaults and clamps before delegating', async () => {
      // Arrange
      const { service, maisVotadas } = fakeService(emptyResponse);
      const controller = new ProposicoesController(service);

      // Act
      await controller.maisVotadas(undefined, undefined);
      await controller.maisVotadas(999, -3);

      // Assert
      expect(maisVotadas).toHaveBeenNthCalledWith(1, 20, 0);
      expect(maisVotadas).toHaveBeenNthCalledWith(2, 100, 0);
    });
  });
});

describe('ProposicoesController.search', () => {
  describe('when the query is useful', () => {
    it('delegates with the trimmed query and clamped limit/offset', async () => {
      // Arrange
      const { service, search } = fakeSearchService(emptySearchResponse);
      const controller = new ProposicoesController(service);

      // Act
      const result = await controller.search('  saúde  ', 999, 5);

      // Assert
      expect(search).toHaveBeenCalledWith('saúde', 100, 5);
      expect(result).toBe(emptySearchResponse);
    });

    it('applies the default pagination when limit and offset are missing', async () => {
      // Arrange
      const { service, search } = fakeSearchService(emptySearchResponse);
      const controller = new ProposicoesController(service);

      // Act
      await controller.search('saúde', undefined, undefined);

      // Assert
      expect(search).toHaveBeenCalledWith('saúde', 20, 0);
    });
  });

  describe('when the query has no useful text', () => {
    it.each([undefined, '', '   '])(
      'rejects %p with a BadRequestException',
      async (q) => {
        // Arrange
        const { service, search } = fakeSearchService(emptySearchResponse);
        const controller = new ProposicoesController(service);

        // Act / Assert
        await expect(controller.search(q, undefined)).rejects.toBeInstanceOf(
          BadRequestException,
        );
        expect(search).not.toHaveBeenCalled();
      },
    );
  });
});
