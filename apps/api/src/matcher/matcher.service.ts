import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { POSICOES_COMPUTAVEIS } from '@vota-comigo/shared-types';
import type {
  MatcherExecucaoRequest,
  MatcherResultado,
  PosicaoMatcher,
} from '@vota-comigo/shared-types';

import { MATCHER_REPOSITORY } from './matcher.repository';
import type { MatcherRepository } from './matcher.repository';
import { toMatcherResultado } from './mappers/compatibilidade-resumida.mapper';
import { computeCompatibilidadeResumida } from './rules/compatibilidade-resumida';
import { validateExecucao } from './rules/matcher-execucao-validation';
import type { Pagination } from './rules/pagination';
import { sortRanking } from './rules/ranking';
import type {
  PosicaoComputavel,
  PosicaoComputavelValue,
} from './types/compatibilidade.types';

const COMPATIBILIDADE_BOM_MATCH_MINIMA = 60;

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

  async execute(
    request: MatcherExecucaoRequest,
    pagination: Pagination,
  ): Promise<MatcherResultado> {
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

    const deputados = await this.repository.loadDeputadosByEscopoWithHistorico(
      request.escopo,
      request.siglaUf,
    );

    const resultado = computeCompatibilidadeResumida({
      posicoes,
      deputados,
      totalPosicoesComputaveis: validation.resumo.totalPosicoesComputaveis,
    });

    const ordenados = sortRanking(
      resultado.deputados,
      request.escopo === 'nacional' ? request.siglaUf : undefined,
    );
    const semBomMatch =
      ordenados.length === 0 ||
      ordenados[0].compatibilidadeBruta < COMPATIBILIDADE_BOM_MATCH_MINIMA;
    const total = ordenados.length;
    const pagina = ordenados.slice(
      pagination.offset,
      pagination.offset + pagination.limit,
    );

    return toMatcherResultado(
      validation.resumo,
      request.escopo,
      resultado,
      pagina,
      { limit: pagination.limit, offset: pagination.offset, total },
      semBomMatch,
    );
  }
}
