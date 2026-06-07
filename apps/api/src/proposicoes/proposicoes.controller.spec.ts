import { ProposicoesController } from './proposicoes.controller';
import type { ProposicoesService } from './proposicoes.service';
import type { MaisVotadasResponse } from '@vota-comigo/shared-types';

function fakeService(response: MaisVotadasResponse) {
  const maisVotadas = jest.fn().mockResolvedValue(response);
  const service = { maisVotadas } as unknown as ProposicoesService;
  return { service, maisVotadas };
}

const emptyResponse: MaisVotadasResponse = {
  items: [],
  total: 0,
  limit: 20,
  offset: 0,
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
