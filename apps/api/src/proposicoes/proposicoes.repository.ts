import { and, eq, exists, sql } from 'drizzle-orm';

import type { DrizzleDatabase } from '@/shared/database/client';
import type { ProposicaoTemaRow } from './types/proposicoes.types';
import {
  proposicao,
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
};

export type ProposicaoDetalheHead = {
  externalIdProposicao: number;
  siglaTipo: string | null;
  numero: number | null;
  ano: number | null;
  ementa: string | null;
  dataApresentacao: string | null;
  ementaDetalhada: string | null;
  urlInteiroTeor: string | null;
  ultimoStatusSiglaOrgao: string | null;
  ultimoStatusDescricaoSituacao: string | null;
  ultimoStatusRegime: string | null;
  ultimoStatusDataHora: string | null;
};

export type VotacaoDetalheRow = {
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
};

export type TemaRow = {
  externalCodTema: number;
  tema: string | null;
};

export type ProposicaoDetalheResult = {
  proposicao: ProposicaoDetalheHead;
  votacoes: readonly VotacaoDetalheRow[];
  temas: readonly TemaRow[];
};

export type { ProposicaoTemaRow };

export type ProposicoesRepository = {
  loadProposicoesWithVotacoesPlenario(
    tema?: number,
  ): Promise<readonly ProposicaoVotacaoJoinRow[]>;
  loadProposicaoDetalhe(
    externalIdProposicao: number,
  ): Promise<ProposicaoDetalheResult | null>;
  loadProposicaoTemas(): Promise<readonly ProposicaoTemaRow[]>;
};

export function createProposicoesRepository(
  db: DrizzleDatabase,
): ProposicoesRepository {
  return {
    async loadProposicoesWithVotacoesPlenario(tema?: number) {
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

      return db
        .select({
          externalIdProposicao: proposicao.externalIdProposicao,
          siglaTipo: proposicao.siglaTipo,
          numero: proposicao.numero,
          ano: proposicao.ano,
          ementa: proposicao.ementa,
          dataApresentacao: proposicao.dataApresentacao,
          ultimoStatusSiglaOrgao: proposicao.ultimoStatusSiglaOrgao,
          ultimoStatusDescricaoSituacao:
            proposicao.ultimoStatusDescricaoSituacao,
          ultimoStatusRegime: proposicao.ultimoStatusRegime,
          ultimoStatusDataHora: proposicao.ultimoStatusDataHora,
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
        })
        .from(votacaoProposicao)
        .innerJoin(votacao, eq(votacaoProposicao.votacaoId, votacao.id))
        .innerJoin(
          proposicao,
          eq(votacaoProposicao.proposicaoId, proposicao.id),
        )
        .where(
          temaCondition !== undefined
            ? and(eq(votacao.escopoVotacao, 'plenario'), temaCondition)
            : eq(votacao.escopoVotacao, 'plenario'),
        );
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
          ementaDetalhada: proposicao.ementaDetalhada,
          urlInteiroTeor: proposicao.urlInteiroTeor,
          ultimoStatusSiglaOrgao: proposicao.ultimoStatusSiglaOrgao,
          ultimoStatusDescricaoSituacao:
            proposicao.ultimoStatusDescricaoSituacao,
          ultimoStatusRegime: proposicao.ultimoStatusRegime,
          ultimoStatusDataHora: proposicao.ultimoStatusDataHora,
        })
        .from(proposicao)
        .where(eq(proposicao.externalIdProposicao, externalIdProposicao))
        .limit(1);

      const head = heads.at(0);
      if (head === undefined) {
        return null;
      }

      const votacoes = await db
        .select({
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

      return { proposicao: head, votacoes, temas };
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
