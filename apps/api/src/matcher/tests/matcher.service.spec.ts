import { BadRequestException } from '@nestjs/common';
import type {
  MatcherExecucaoRequest,
  PosicaoMatcher,
} from '@vota-comigo/shared-types';

import type { MatcherRepository } from '../matcher.repository';
import { MatcherService } from '../matcher.service';

function posicao(overrides: Partial<PosicaoMatcher> = {}): PosicaoMatcher {
  return {
    externalIdProposicao: 1,
    posicao: 'deveria_ser_aprovada',
    ...overrides,
  };
}

function request(
  overrides: Partial<MatcherExecucaoRequest> = {},
): MatcherExecucaoRequest {
  return {
    siglaUf: 'PE',
    posicoes: [
      posicao({ externalIdProposicao: 1, posicao: 'deveria_ser_aprovada' }),
      posicao({ externalIdProposicao: 2, posicao: 'nao_deveria_ser_aprovada' }),
      posicao({ externalIdProposicao: 3, posicao: 'deveria_ser_aprovada' }),
    ],
    ...overrides,
  };
}

type FakeRepo = MatcherRepository & {
  calls: number[][];
};

function fakeRepository(computaveis: ReadonlySet<number>): FakeRepo {
  const calls: number[][] = [];
  return {
    calls,
    loadComputaveisExternalIds: async (externalIds) => {
      calls.push([...externalIds]);
      return computaveis;
    },
  };
}

describe('MatcherService.validarExecucao', () => {
  describe('when every selected proposicao is computavel and the minimum is met', () => {
    it('resolves with the normalized execution summary', async () => {
      // Arrange
      const service = new MatcherService(fakeRepository(new Set([1, 2, 3])));

      // Act
      const resumo = await service.validarExecucao(
        request({ cidade: 'Recife' }),
      );

      // Assert
      expect(resumo).toEqual({
        siglaUf: 'PE',
        cidade: 'Recife',
        totalProposicoesSelecionadas: 3,
        totalPosicoesComputaveis: 3,
      });
    });

    it('asks the repository only for the selected external ids', async () => {
      // Arrange
      const repo = fakeRepository(new Set([1, 2, 3]));
      const service = new MatcherService(repo);

      // Act
      await service.validarExecucao(request());

      // Assert
      expect(repo.calls).toEqual([[1, 2, 3]]);
    });
  });

  describe('when a selected proposicao is not computavel', () => {
    it('rejects with a BadRequestException', async () => {
      // Arrange
      const service = new MatcherService(fakeRepository(new Set([1, 2])));

      // Act & Assert
      await expect(service.validarExecucao(request())).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  describe('when there are fewer than three computavel positions', () => {
    it('rejects with a BadRequestException', async () => {
      // Arrange
      const service = new MatcherService(fakeRepository(new Set([1, 2, 3])));
      const payload = request({
        posicoes: [
          posicao({ externalIdProposicao: 1, posicao: 'deveria_ser_aprovada' }),
          posicao({
            externalIdProposicao: 2,
            posicao: 'nao_deveria_ser_aprovada',
          }),
          posicao({ externalIdProposicao: 3, posicao: 'nao_sei' }),
        ],
      });

      // Act & Assert
      await expect(service.validarExecucao(payload)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });
});
