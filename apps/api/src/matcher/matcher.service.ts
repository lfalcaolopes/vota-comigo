import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import type {
  MatcherExecucaoRequest,
  MatcherExecucaoResumo,
} from '@vota-comigo/shared-types';

import { MATCHER_REPOSITORY } from './matcher.repository';
import type { MatcherRepository } from './matcher.repository';
import { validateExecucao } from './rules/matcher-execucao-validation';

@Injectable()
export class MatcherService {
  constructor(
    @Inject(MATCHER_REPOSITORY)
    private readonly repository: MatcherRepository,
  ) {}

  async validateExecucao(
    request: MatcherExecucaoRequest,
  ): Promise<MatcherExecucaoResumo> {
    const externalIdProposicoes = request.posicoes.map(
      (posicao) => posicao.externalIdProposicao,
    );
    const externalIdProposicoesComputaveis =
      await this.repository.loadExternalIdProposicoesComputaveis(
        externalIdProposicoes,
      );

    const result = validateExecucao({
      siglaUf: request.siglaUf,
      cidade: request.cidade,
      posicoes: request.posicoes,
      externalIdProposicoesComputaveis,
    });

    if (!result.ok) {
      throw new BadRequestException(result.error);
    }
    return result.resumo;
  }
}
