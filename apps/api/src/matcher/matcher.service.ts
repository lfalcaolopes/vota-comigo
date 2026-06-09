import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { POSICOES_COMPUTAVEIS } from '@vota-comigo/shared-types';
import type {
  MatcherExecucaoRequest,
  MatcherResultado,
  PosicaoMatcher,
} from '@vota-comigo/shared-types';

import { MATCHER_REPOSITORY } from './matcher.repository';
import type { MatcherRepository } from './matcher.repository';
import { toMatcherResultadoEstadual } from './mappers/compatibilidade-resumida.mapper';
import { computeCompatibilidadeResumida } from './rules/compatibilidade-resumida';
import { validateExecucao } from './rules/matcher-execucao-validation';
import type {
  PosicaoComputavel,
  PosicaoComputavelValue,
} from './types/compatibilidade.types';

type PosicaoComputavelMatcher = PosicaoMatcher & {
  posicao: PosicaoComputavelValue;
};

function isComputavel(
  posicao: PosicaoMatcher,
): posicao is PosicaoComputavelMatcher {
  return (POSICOES_COMPUTAVEIS as readonly string[]).includes(posicao.posicao);
}

@Injectable()
export class MatcherService {
  constructor(
    @Inject(MATCHER_REPOSITORY)
    private readonly repository: MatcherRepository,
  ) {}

  async execute(request: MatcherExecucaoRequest): Promise<MatcherResultado> {
    const externalIdProposicoes = request.posicoes.map(
      (posicao) => posicao.externalIdProposicao,
    );
    const externalIdProposicoesComputaveis =
      await this.repository.loadExternalIdProposicoesComputaveis(
        externalIdProposicoes,
      );

    const validation = validateExecucao({
      siglaUf: request.siglaUf,
      cidade: request.cidade,
      posicoes: request.posicoes,
      externalIdProposicoesComputaveis,
    });

    if (!validation.ok) {
      throw new BadRequestException(validation.error);
    }

    const computaveis = request.posicoes.filter(isComputavel);
    const votacoesReferencia =
      await this.repository.loadVotacoesReferenciaWithVotos(
        computaveis.map((posicao) => posicao.externalIdProposicao),
      );
    const referenciaByProposicao = new Map(
      votacoesReferencia.map((item) => [item.externalIdProposicao, item]),
    );

    const posicoes: PosicaoComputavel[] = computaveis.flatMap((posicao) => {
      const referencia = referenciaByProposicao.get(
        posicao.externalIdProposicao,
      );
      if (referencia === undefined) {
        return [];
      }
      return [
        {
          externalIdProposicao: posicao.externalIdProposicao,
          posicao: posicao.posicao,
          votacaoReferencia: referencia.votacaoReferencia,
          votosByDeputado: referencia.votosByDeputado,
        },
      ];
    });

    const deputados = await this.repository.loadDeputadosByEstadoWithHistorico(
      request.siglaUf,
    );

    const resultado = computeCompatibilidadeResumida({ posicoes, deputados });

    return toMatcherResultadoEstadual(validation.resumo, resultado);
  }
}
