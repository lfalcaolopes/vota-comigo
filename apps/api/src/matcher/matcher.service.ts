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

  async validarExecucao(
    request: MatcherExecucaoRequest,
  ): Promise<MatcherExecucaoResumo> {
    const externalIds = request.posicoes.map(
      (posicao) => posicao.externalIdProposicao,
    );
    const computaveis =
      await this.repository.loadComputaveisExternalIds(externalIds);

    const result = validateExecucao({
      siglaUf: request.siglaUf,
      cidade: request.cidade,
      posicoes: request.posicoes,
      computaveis,
    });

    if (!result.ok) {
      throw new BadRequestException(result.error);
    }
    return result.resumo;
  }
}
