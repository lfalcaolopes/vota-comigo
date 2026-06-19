import { and, eq, exists, sql } from 'drizzle-orm';
import {
  proposicaoResumoIaGenerationStatus,
  proposicaoResumoIaReviewStatus,
  votacaoReferenciaPattern,
} from '@vota-comigo/shared-types';

import type { DrizzleDatabase } from '@/shared/database/client';
import type {
  ProposicaoTemaRow,
  ProposicaoResumoIaProjection,
  RankedProposicao,
} from './types/proposicoes.types';
import {
  proposicao,
  proposicaoComputavel,
  proposicaoResumoIa,
  proposicaoTema,
  tema,
  votacao,
  votacaoProposicao,
  votacaoVotos,
} from '@/shared/database/schema';

export const PROPOSICOES_REPOSITORY = Symbol('PROPOSICOES_REPOSITORY');

export type ProposicaoVotacaoJoinRow = {
  externalIdProposicao: number;
  siglaTipo: string | null;
  numero: number | null;
  ano: number | null;
  ementa: string | null;
  descricaoTipo: string | null;
  ementaDetalhada: string | null;
  keywords: string | null;
  dataApresentacao: string | null;
  ultimoStatusSiglaOrgao: string | null;
  ultimoStatusDescricaoSituacao: string | null;
  ultimoStatusRegime: string | null;
  ultimoStatusDataHora: string | null;
  externalIdVotacao: string;
  data: string | null;
  dataHoraRegistro: string | null;
  descricao: string | null;
  ultimaAberturaVotacaoDescricao: string | null;
  ultimaApresentacaoProposicaoDescricao: string | null;
  votosSim: number | null;
  votosNao: number | null;
  votosOutros: number | null;
  aprovacao: number | null;
  resumoIa: ProposicaoResumoIaProjection | null;
};

export type ProposicaoDetalheHead = {
  externalIdProposicao: number;
  siglaTipo: string | null;
  numero: number | null;
  ano: number | null;
  ementa: string | null;
  dataApresentacao: string | null;
  descricaoTipo: string | null;
  ementaDetalhada: string | null;
  keywords: string | null;
  urlInteiroTeor: string | null;
  ultimoStatusSiglaOrgao: string | null;
  ultimoStatusDescricaoSituacao: string | null;
  ultimoStatusRegime: string | null;
  ultimoStatusDataHora: string | null;
  votacaoReferenciaId: string | null;
};

export type VotacaoDetalheRow = {
  votacaoId: string;
  externalIdVotacao: string;
  data: string | null;
  dataHoraRegistro: string | null;
  descricao: string | null;
  ultimaAberturaVotacaoDescricao: string | null;
  ultimaApresentacaoProposicaoDescricao: string | null;
  votosSim: number | null;
  votosNao: number | null;
  votosOutros: number | null;
  aprovacao: number | null;
  votacaoVotosExternalId: string | null;
  votacaoVotosSim: number | null;
  votacaoVotosNao: number | null;
  votosAbstencao: number | null;
  votosObstrucao: number | null;
  votosArtigo17: number | null;
  votosNaoInformado: number | null;
  isReferenciaMatcher: boolean;
};

export type TemaRow = {
  externalCodTema: number;
  tema: string | null;
};

export type ProposicaoDetalheResult = {
  proposicao: ProposicaoDetalheHead;
  resumoIa: ProposicaoResumoIaProjection | null;
  votacoes: readonly VotacaoDetalheRow[];
  temas: readonly TemaRow[];
};

export type { ProposicaoTemaRow };

function toProposicaoResumoIaProjection(row: {
  resumoIaSourceHash: string | null;
  resumoIaGenerationStatus: string | null;
  resumoIaReviewStatus: string | null;
  resumoIaCard: string | null;
  resumoIaDetalhe: string | null;
}): ProposicaoResumoIaProjection | null {
  if (
    row.resumoIaSourceHash === null ||
    row.resumoIaGenerationStatus === null ||
    row.resumoIaReviewStatus === null
  ) {
    return null;
  }

  return {
    sourceHash: row.resumoIaSourceHash,
    generationStatus: proposicaoResumoIaGenerationStatus.parse(
      row.resumoIaGenerationStatus,
    ),
    reviewStatus: proposicaoResumoIaReviewStatus.parse(
      row.resumoIaReviewStatus,
    ),
    resumoCard: row.resumoIaCard,
    resumoDetalhe: row.resumoIaDetalhe,
  };
}

export type ProposicoesRepository = {
  loadProposicoesComputaveis(
    tema?: number,
  ): Promise<readonly RankedProposicao[]>;
  loadProposicaoDetalhe(
    externalIdProposicao: number,
  ): Promise<ProposicaoDetalheResult | null>;
  loadProposicaoTemas(): Promise<readonly ProposicaoTemaRow[]>;
};

export function createProposicoesRepository(
  db: DrizzleDatabase,
): ProposicoesRepository {
  return {
    async loadProposicoesComputaveis(tema?: number) {
      const temaCondition =
        tema !== undefined
          ? exists(
              db
                .select({ _: sql`1` })
                .from(proposicaoTema)
                .where(
                  and(
                    eq(proposicaoTema.proposicaoId, proposicao.id),
                    eq(proposicaoTema.externalCodTema, tema),
                  ),
                ),
            )
          : undefined;

      const query = db
        .select({
          externalIdProposicao: proposicao.externalIdProposicao,
          siglaTipo: proposicao.siglaTipo,
          numero: proposicao.numero,
          ano: proposicao.ano,
          ementa: proposicao.ementa,
          descricaoTipo: proposicao.descricaoTipo,
          ementaDetalhada: proposicao.ementaDetalhada,
          keywords: proposicao.keywords,
          dataApresentacao: proposicao.dataApresentacao,
          ultimoStatusSiglaOrgao: proposicao.ultimoStatusSiglaOrgao,
          ultimoStatusDescricaoSituacao:
            proposicao.ultimoStatusDescricaoSituacao,
          ultimoStatusRegime: proposicao.ultimoStatusRegime,
          ultimoStatusDataHora: proposicao.ultimoStatusDataHora,
          volumeVotacoesPlenario: proposicaoComputavel.volumeVotacoesPlenario,
          dataUltimaVotacao: proposicaoComputavel.dataUltimaVotacao,
          externalIdVotacao: votacao.externalIdVotacao,
          data: votacao.data,
          dataHoraRegistro: votacao.dataHoraRegistro,
          descricao: votacao.descricao,
          ultimaAberturaVotacaoDescricao:
            votacao.ultimaAberturaVotacaoDescricao,
          ultimaApresentacaoProposicaoDescricao:
            votacao.ultimaApresentacaoProposicaoDescricao,
          votosSim: votacao.votosSim,
          votosNao: votacao.votosNao,
          votosOutros: votacao.votosOutros,
          aprovacao: votacao.aprovacao,
          votacaoReferenciaPattern:
            proposicaoComputavel.votacaoReferenciaPattern,
          resumoIaSourceHash: proposicaoResumoIa.sourceHash,
          resumoIaGenerationStatus: proposicaoResumoIa.generationStatus,
          resumoIaReviewStatus: proposicaoResumoIa.reviewStatus,
          resumoIaCard: proposicaoResumoIa.resumoCard,
          resumoIaDetalhe: proposicaoResumoIa.resumoDetalhe,
        })
        .from(proposicaoComputavel)
        .innerJoin(
          proposicao,
          eq(proposicaoComputavel.proposicaoId, proposicao.id),
        )
        .innerJoin(
          votacao,
          eq(proposicaoComputavel.votacaoReferenciaId, votacao.id),
        )
        .leftJoin(
          proposicaoResumoIa,
          eq(proposicaoResumoIa.proposicaoId, proposicao.id),
        );

      const rows =
        temaCondition === undefined
          ? await query
          : await query.where(temaCondition);

      return rows.map((row) => ({
        proposicao: {
          externalIdProposicao: row.externalIdProposicao,
          siglaTipo: row.siglaTipo,
          numero: row.numero,
          ano: row.ano,
          ementa: row.ementa,
          descricaoTipo: row.descricaoTipo,
          ementaDetalhada: row.ementaDetalhada,
          keywords: row.keywords,
          dataApresentacao: row.dataApresentacao,
          ultimoStatusSiglaOrgao: row.ultimoStatusSiglaOrgao,
          ultimoStatusDescricaoSituacao: row.ultimoStatusDescricaoSituacao,
          ultimoStatusRegime: row.ultimoStatusRegime,
          ultimoStatusDataHora: row.ultimoStatusDataHora,
        },
        resumoIa: toProposicaoResumoIaProjection(row),
        volumeVotacoesPlenario: row.volumeVotacoesPlenario,
        dataUltimaVotacao: row.dataUltimaVotacao,
        referencia: {
          externalIdVotacao: row.externalIdVotacao,
          data: row.data,
          dataHoraRegistro: row.dataHoraRegistro,
          descricao: row.descricao,
          ultimaAberturaVotacaoDescricao: row.ultimaAberturaVotacaoDescricao,
          ultimaApresentacaoProposicaoDescricao:
            row.ultimaApresentacaoProposicaoDescricao,
          votosSim: row.votosSim,
          votosNao: row.votosNao,
          votosOutros: row.votosOutros,
          aprovacao: row.aprovacao,
          classification: {
            pattern: votacaoReferenciaPattern.parse(
              row.votacaoReferenciaPattern,
            ),
          },
        },
      }));
    },

    async loadProposicaoDetalhe(externalIdProposicao) {
      const heads = await db
        .select({
          externalIdProposicao: proposicao.externalIdProposicao,
          siglaTipo: proposicao.siglaTipo,
          numero: proposicao.numero,
          ano: proposicao.ano,
          ementa: proposicao.ementa,
          dataApresentacao: proposicao.dataApresentacao,
          descricaoTipo: proposicao.descricaoTipo,
          ementaDetalhada: proposicao.ementaDetalhada,
          keywords: proposicao.keywords,
          urlInteiroTeor: proposicao.urlInteiroTeor,
          ultimoStatusSiglaOrgao: proposicao.ultimoStatusSiglaOrgao,
          ultimoStatusDescricaoSituacao:
            proposicao.ultimoStatusDescricaoSituacao,
          ultimoStatusRegime: proposicao.ultimoStatusRegime,
          ultimoStatusDataHora: proposicao.ultimoStatusDataHora,
          votacaoReferenciaId: proposicaoComputavel.votacaoReferenciaId,
          resumoIaSourceHash: proposicaoResumoIa.sourceHash,
          resumoIaGenerationStatus: proposicaoResumoIa.generationStatus,
          resumoIaReviewStatus: proposicaoResumoIa.reviewStatus,
          resumoIaCard: proposicaoResumoIa.resumoCard,
          resumoIaDetalhe: proposicaoResumoIa.resumoDetalhe,
        })
        .from(proposicao)
        .leftJoin(
          proposicaoComputavel,
          eq(proposicaoComputavel.proposicaoId, proposicao.id),
        )
        .leftJoin(
          proposicaoResumoIa,
          eq(proposicaoResumoIa.proposicaoId, proposicao.id),
        )
        .where(eq(proposicao.externalIdProposicao, externalIdProposicao))
        .limit(1);

      const row = heads.at(0);
      if (row === undefined) {
        return null;
      }
      const {
        resumoIaSourceHash,
        resumoIaGenerationStatus,
        resumoIaReviewStatus,
        resumoIaCard,
        resumoIaDetalhe,
        ...head
      } = row;
      const resumoIa = toProposicaoResumoIaProjection({
        resumoIaSourceHash,
        resumoIaGenerationStatus,
        resumoIaReviewStatus,
        resumoIaCard,
        resumoIaDetalhe,
      });

      const votacoes = await db
        .select({
          votacaoId: votacao.id,
          externalIdVotacao: votacao.externalIdVotacao,
          data: votacao.data,
          dataHoraRegistro: votacao.dataHoraRegistro,
          descricao: votacao.descricao,
          ultimaAberturaVotacaoDescricao:
            votacao.ultimaAberturaVotacaoDescricao,
          ultimaApresentacaoProposicaoDescricao:
            votacao.ultimaApresentacaoProposicaoDescricao,
          votosSim: votacao.votosSim,
          votosNao: votacao.votosNao,
          votosOutros: votacao.votosOutros,
          aprovacao: votacao.aprovacao,
          votacaoVotosExternalId: votacaoVotos.externalIdVotacao,
          votacaoVotosSim: votacaoVotos.votosSim,
          votacaoVotosNao: votacaoVotos.votosNao,
          votosAbstencao: votacaoVotos.votosAbstencao,
          votosObstrucao: votacaoVotos.votosObstrucao,
          votosArtigo17: votacaoVotos.votosArtigo17,
          votosNaoInformado: votacaoVotos.votosNaoInformado,
          isReferenciaMatcher: sql<boolean>`${votacao.id} = ${head.votacaoReferenciaId}`,
        })
        .from(votacaoProposicao)
        .innerJoin(votacao, eq(votacaoProposicao.votacaoId, votacao.id))
        .leftJoin(votacaoVotos, eq(votacaoVotos.votacaoId, votacao.id))
        .where(
          and(
            eq(votacaoProposicao.externalIdProposicao, externalIdProposicao),
            eq(votacao.escopoVotacao, 'plenario'),
          ),
        );

      const temas = await db
        .select({
          externalCodTema: tema.externalCodTema,
          tema: tema.tema,
        })
        .from(proposicaoTema)
        .innerJoin(tema, eq(proposicaoTema.temaId, tema.id))
        .where(eq(proposicaoTema.externalIdProposicao, externalIdProposicao));

      return { proposicao: head, resumoIa, votacoes, temas };
    },

    async loadProposicaoTemas() {
      return db
        .select({
          externalIdProposicao: proposicaoTema.externalIdProposicao,
          externalCodTema: proposicaoTema.externalCodTema,
          tema: tema.tema,
        })
        .from(proposicaoTema)
        .innerJoin(tema, eq(proposicaoTema.temaId, tema.id))
        .where(sql`${tema.tema} is not null`);
    },
  };
}
