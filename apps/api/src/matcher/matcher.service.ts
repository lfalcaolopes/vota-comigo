import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { POSICOES_COMPUTAVEIS } from '@vota-comigo/shared-types';
import type {
  MatcherDeputadoDetalhe,
  MatcherExecucaoRequest,
  MatcherExecucaoResumo,
  MatcherResultado,
  PosicaoMatcher,
  UsoCotaResumo,
} from '@vota-comigo/shared-types';

import { MATCHER_REPOSITORY } from './matcher.repository';
import type { MatcherRepository } from './matcher.repository';
import { toMatcherDeputadoDetalhe } from './mappers/compatibilidade-detalhe.mapper';
import { toMatcherResultado } from './mappers/compatibilidade-resumida.mapper';
import { computeCompatibilidadeDetalhe } from './rules/compatibilidade-detalhe';
import { computeCompatibilidadeResumida } from './rules/compatibilidade-resumida';
import { filtrarPorAtividade } from './rules/filtro-atividade';
import {
  filtrarPorAmostraPequena,
  filtrarPorPartido,
  filtrarPorSexo,
} from './rules/filtro-recorte';
import { passesFiltroConcordancia } from './rules/filtro-concordancia';
import { validateExecucao } from './rules/matcher-execucao-validation';
import type { Pagination } from './rules/pagination';
import { sortRanking, sortRankingByUsoCota } from './rules/ranking';
import type {
  PosicaoComputavel,
  PosicaoComputavelValue,
} from './types/compatibilidade.types';

type PreparedMatcherExecucao = {
  resumo: MatcherExecucaoResumo;
  posicoes: PosicaoComputavel[];
};

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

  private async prepareExecucao(
    request: MatcherExecucaoRequest,
  ): Promise<PreparedMatcherExecucao> {
    const externalIdProposicoes = request.posicoes.map(
      (posicao) => posicao.externalIdProposicao,
    );
    const externalIdProposicoesComputaveis =
      await this.repository.loadExternalIdProposicoesComputaveis(
        externalIdProposicoes,
      );

    const validation = validateExecucao({
      siglaUf: request.siglaUf,
      posicoes: request.posicoes,
      externalIdProposicoesFiltroConcordancia:
        request.externalIdProposicoesFiltroConcordancia,
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
          proposicao: referencia.proposicao,
          votacaoReferencia: referencia.votacaoReferencia,
          votacaoReferenciaResumo: referencia.votacaoReferenciaResumo,
          votosByDeputado: referencia.votosByDeputado,
        },
      ];
    });

    return { resumo: validation.resumo, posicoes };
  }

  async execute(
    request: MatcherExecucaoRequest,
    pagination: Pagination,
  ): Promise<MatcherResultado> {
    const { resumo, posicoes } = await this.prepareExecucao(request);

    const deputados = await this.repository.loadDeputadosByEscopoWithHistorico(
      request.escopo,
      request.siglaUf,
    );

    const externalIdProposicoesFiltroConcordancia = new Set(
      request.externalIdProposicoesFiltroConcordancia,
    );
    const posicoesMarcadas = posicoes.filter((posicao) =>
      externalIdProposicoesFiltroConcordancia.has(posicao.externalIdProposicao),
    );
    const deputadosConcordantes = deputados.filter((deputado) =>
      passesFiltroConcordancia(deputado, posicoesMarcadas),
    );

    const resultado = computeCompatibilidadeResumida({
      posicoes,
      deputados: deputadosConcordantes,
      totalPosicoesComputaveis: resumo.totalPosicoesComputaveis,
    });
    const usoCotaByDeputadoId: ReadonlyMap<string, UsoCotaResumo> =
      (await this.repository.loadUsoCota?.(
        deputadosConcordantes.map((deputado) => deputado.deputadoId),
      )) ?? new Map();
    const deputadoIdByExternalId = new Map(
      deputadosConcordantes.map((deputado) => [
        deputado.externalIdDeputado,
        deputado.deputadoId,
      ]),
    );
    const resultadoComUsoCota = resultado.deputados.map((deputado) => {
      const deputadoId = deputadoIdByExternalId.get(
        deputado.externalIdDeputado,
      );
      return {
        ...deputado,
        usoCota: (deputadoId === undefined
          ? undefined
          : usoCotaByDeputadoId.get(deputadoId)) ?? {
          status: 'indisponivel' as const,
          legislatura: null,
          motivo: 'fonte-incompleta' as const,
        },
      };
    });

    // O recorte roda depois do cálculo: filtrar a entrada corromperia
    // totalDeputadosAvaliados e deputadosHistoricoIncompleto.
    const elegiveis = filtrarPorAmostraPequena(
      filtrarPorSexo(
        filtrarPorPartido(
          filtrarPorAtividade(resultadoComUsoCota, request.apenasEmAtividade),
          request.partidos,
        ),
        request.sexo,
      ),
      request.ocultarAmostraPequena,
    );
    const siglaUfPrioritaria =
      request.escopo === 'nacional' ? request.siglaUf : undefined;
    const ordenados =
      request.sort === 'menor-uso-cota'
        ? sortRankingByUsoCota(elegiveis, siglaUfPrioritaria)
        : sortRanking(elegiveis, siglaUfPrioritaria);
    const total = ordenados.length;
    const pagina = ordenados.slice(
      pagination.offset,
      pagination.offset + pagination.limit,
    );

    return toMatcherResultado(resumo, request.escopo, resultado, pagina, {
      limit: pagination.limit,
      offset: pagination.offset,
      total,
    });
  }

  async detail(
    externalIdDeputado: number,
    request: MatcherExecucaoRequest,
  ): Promise<MatcherDeputadoDetalhe> {
    const { resumo, posicoes } = await this.prepareExecucao(request);
    const deputado =
      await this.repository.loadDeputadoByExternalIdWithHistorico(
        request.escopo,
        request.siglaUf,
        externalIdDeputado,
      );

    if (deputado === null) {
      throw new NotFoundException('deputado nao encontrado');
    }

    const detalhe = computeCompatibilidadeDetalhe({
      posicoes,
      deputado,
      totalPosicoesComputaveis: resumo.totalPosicoesComputaveis,
    });

    const usoCota: ReadonlyMap<string, UsoCotaResumo> =
      (await this.repository.loadUsoCota?.([deputado.deputadoId])) ?? new Map();
    detalhe.usoCota = usoCota.get(deputado.deputadoId) ?? {
      status: 'indisponivel',
      legislatura: null,
      motivo: 'fonte-incompleta',
    };

    return toMatcherDeputadoDetalhe(resumo, detalhe);
  }
}
