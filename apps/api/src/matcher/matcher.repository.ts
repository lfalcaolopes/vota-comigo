import { desc, eq, inArray } from 'drizzle-orm';
import type {
  EscopoMatcher,
  SiglaUf,
  VotacaoReferenciaPattern,
  VotoCategoria,
} from '@vota-comigo/shared-types';
import {
  proposicaoResumoIaGenerationStatus,
  proposicaoResumoIaReviewStatus,
  votacaoReferenciaPattern,
} from '@vota-comigo/shared-types';

import type { IntervaloExercicio } from '@/exercicio/types/exercicio.types';
import {
  toProposicaoCard,
  toVotacaoReferenciaResumo,
} from '@/proposicoes/mappers/proposicao-card.mapper';
import type {
  ProposicaoCardResumo,
  ProposicaoResumoIaCardProjection,
} from '@/proposicoes/types/proposicoes.types';
import type { DrizzleDatabase } from '@/shared/database/client';
import {
  deputado,
  deputadoExercicioIntervalo,
  deputadoHistorico,
  partido,
  proposicao,
  proposicaoComputavel,
  proposicaoResumoIa,
  votacao,
  votacaoVotos,
} from '@/shared/database/schema';

import type {
  DeputadoCompatibilidadeInput,
  VotacaoReferenciaVotos,
} from './types/compatibilidade.types';

type RankedReferencia = {
  proposicao: ProposicaoCardResumo;
  resumoIa: ProposicaoResumoIaCardProjection | null;
  volumeVotacoesPlenario: number;
  dataUltimaVotacao: string | null;
  referencia: {
    externalIdVotacao: string;
    data: string | null;
    dataHoraRegistro: string | null;
    descricao: string | null;
    votosSim: number | null;
    votosNao: number | null;
    votosOutros: number | null;
    aprovacao: number | null;
    classification: { pattern: VotacaoReferenciaPattern };
  };
};

export const MATCHER_REPOSITORY = Symbol('MATCHER_REPOSITORY');

export type MatcherRepository = {
  loadExternalIdProposicoesComputaveis(
    externalIdProposicoes: readonly number[],
  ): Promise<ReadonlySet<number>>;
  loadVotacoesReferenciaWithVotos(
    externalIdProposicoes: readonly number[],
  ): Promise<readonly VotacaoReferenciaVotos[]>;
  loadDeputadosByEscopoWithHistorico(
    escopo: EscopoMatcher,
    siglaUf: SiglaUf,
  ): Promise<readonly DeputadoCompatibilidadeInput[]>;
  loadDeputadoByExternalIdWithHistorico(
    escopo: EscopoMatcher,
    siglaUf: SiglaUf,
    externalIdDeputado: number,
  ): Promise<DeputadoCompatibilidadeInput | null>;
};

async function loadRankedProposicoesComputaveis(
  db: DrizzleDatabase,
  externalIdProposicoes: readonly number[],
): Promise<readonly RankedReferencia[]> {
  const rows = await db
    .select({
      externalIdProposicao: proposicao.externalIdProposicao,
      siglaTipo: proposicao.siglaTipo,
      numero: proposicao.numero,
      ano: proposicao.ano,
      ementa: proposicao.ementa,
      dataApresentacao: proposicao.dataApresentacao,
      volumeVotacoesPlenario: proposicaoComputavel.volumeVotacoesPlenario,
      dataUltimaVotacao: proposicaoComputavel.dataUltimaVotacao,
      votacaoReferenciaPattern: proposicaoComputavel.votacaoReferenciaPattern,
      externalIdVotacao: votacao.externalIdVotacao,
      data: votacao.data,
      dataHoraRegistro: votacao.dataHoraRegistro,
      descricao: votacao.descricao,
      votosSim: votacao.votosSim,
      votosNao: votacao.votosNao,
      votosOutros: votacao.votosOutros,
      aprovacao: votacao.aprovacao,
      resumoIaGenerationStatus: proposicaoResumoIa.generationStatus,
      resumoIaReviewStatus: proposicaoResumoIa.reviewStatus,
      resumoIaCard: proposicaoResumoIa.resumoCard,
    })
    .from(proposicaoComputavel)
    .innerJoin(proposicao, eq(proposicaoComputavel.proposicaoId, proposicao.id))
    .innerJoin(
      votacao,
      eq(proposicaoComputavel.votacaoReferenciaId, votacao.id),
    )
    .leftJoin(
      proposicaoResumoIa,
      eq(proposicaoResumoIa.proposicaoId, proposicao.id),
    )
    .where(
      inArray(proposicao.externalIdProposicao, [...externalIdProposicoes]),
    );

  return rows.map((row) => ({
    proposicao: {
      externalIdProposicao: row.externalIdProposicao,
      siglaTipo: row.siglaTipo,
      numero: row.numero,
      ano: row.ano,
      ementa: row.ementa,
      dataApresentacao: row.dataApresentacao,
    },
    resumoIa:
      row.resumoIaGenerationStatus === null || row.resumoIaReviewStatus === null
        ? null
        : {
            generationStatus: proposicaoResumoIaGenerationStatus.parse(
              row.resumoIaGenerationStatus,
            ),
            reviewStatus: proposicaoResumoIaReviewStatus.parse(
              row.resumoIaReviewStatus,
            ),
            resumoCard: row.resumoIaCard,
          },
    volumeVotacoesPlenario: row.volumeVotacoesPlenario,
    dataUltimaVotacao: row.dataUltimaVotacao,
    referencia: {
      externalIdVotacao: row.externalIdVotacao,
      data: row.data,
      dataHoraRegistro: row.dataHoraRegistro,
      descricao: row.descricao,
      votosSim: row.votosSim,
      votosNao: row.votosNao,
      votosOutros: row.votosOutros,
      aprovacao: row.aprovacao,
      classification: {
        pattern: votacaoReferenciaPattern.parse(row.votacaoReferenciaPattern),
      },
    },
  }));
}

async function loadIntervalosByDeputado(
  db: DrizzleDatabase,
  deputadoIds: readonly string[],
): Promise<ReadonlyMap<string, IntervaloExercicio[]>> {
  const rows = await db
    .select({
      deputadoId: deputadoExercicioIntervalo.deputadoId,
      openedAt: deputadoExercicioIntervalo.openedAt,
      closedAt: deputadoExercicioIntervalo.closedAt,
    })
    .from(deputadoExercicioIntervalo)
    .where(inArray(deputadoExercicioIntervalo.deputadoId, [...deputadoIds]))
    .orderBy(deputadoExercicioIntervalo.openedAt);

  const intervalosByDeputado = new Map<string, IntervaloExercicio[]>();
  for (const row of rows) {
    const intervalo: IntervaloExercicio = {
      openedAt: row.openedAt,
      closedAt: row.closedAt,
    };
    const existing = intervalosByDeputado.get(row.deputadoId);
    if (existing === undefined) {
      intervalosByDeputado.set(row.deputadoId, [intervalo]);
    } else {
      existing.push(intervalo);
    }
  }
  return intervalosByDeputado;
}

function invertVotos(
  votosJson: Record<VotoCategoria, readonly string[]>,
): ReadonlyMap<string, VotoCategoria> {
  const votosByDeputado = new Map<string, VotoCategoria>();
  for (const categoria of Object.keys(votosJson) as VotoCategoria[]) {
    for (const deputadoId of votosJson[categoria]) {
      votosByDeputado.set(deputadoId, categoria);
    }
  }
  return votosByDeputado;
}

export function createMatcherRepository(
  db: DrizzleDatabase,
): MatcherRepository {
  return {
    async loadExternalIdProposicoesComputaveis(externalIdProposicoes) {
      if (externalIdProposicoes.length === 0) {
        return new Set<number>();
      }

      const rows = await db
        .select({
          externalIdProposicao: proposicao.externalIdProposicao,
        })
        .from(proposicaoComputavel)
        .innerJoin(
          proposicao,
          eq(proposicaoComputavel.proposicaoId, proposicao.id),
        )
        .where(
          inArray(proposicao.externalIdProposicao, [...externalIdProposicoes]),
        );

      return new Set(rows.map((row) => row.externalIdProposicao));
    },

    async loadVotacoesReferenciaWithVotos(externalIdProposicoes) {
      if (externalIdProposicoes.length === 0) {
        return [];
      }

      const ranked = await loadRankedProposicoesComputaveis(
        db,
        externalIdProposicoes,
      );
      if (ranked.length === 0) {
        return [];
      }

      const referenciaIds = ranked.map(
        (item) => item.referencia.externalIdVotacao,
      );
      const votosRows = await db
        .select({
          externalIdVotacao: votacaoVotos.externalIdVotacao,
          votosJson: votacaoVotos.votosJson,
        })
        .from(votacaoVotos)
        .where(inArray(votacaoVotos.externalIdVotacao, referenciaIds));

      const votosByVotacao = new Map(
        votosRows.map((row) => [
          row.externalIdVotacao,
          invertVotos(row.votosJson as Record<VotoCategoria, string[]>),
        ]),
      );

      return ranked.map((item) => ({
        externalIdProposicao: item.proposicao.externalIdProposicao,
        proposicao: toProposicaoCard(item),
        votacaoReferencia: {
          dataHoraRegistro: item.referencia.dataHoraRegistro,
          data: item.referencia.data,
        },
        votacaoReferenciaResumo: toVotacaoReferenciaResumo(item.referencia),
        votosByDeputado:
          votosByVotacao.get(item.referencia.externalIdVotacao) ??
          new Map<string, VotoCategoria>(),
      }));
    },

    async loadDeputadosByEscopoWithHistorico(escopo, siglaUf) {
      const maisRecente = db
        .selectDistinctOn([deputadoHistorico.deputadoId], {
          deputadoId: deputadoHistorico.deputadoId,
          siglaUf: deputadoHistorico.siglaUf,
          urlFoto: deputadoHistorico.urlFoto,
          nomeEleitoral: deputadoHistorico.nomeEleitoral,
          partidoId: deputadoHistorico.partidoId,
        })
        .from(deputadoHistorico)
        .orderBy(deputadoHistorico.deputadoId, desc(deputadoHistorico.dataHora))
        .as('mais_recente');

      const base = db
        .select({
          deputadoId: maisRecente.deputadoId,
          externalIdDeputado: deputado.externalIdDeputado,
          nome: deputado.nome,
          nomeCivil: deputado.nomeCivil,
          siglaUf: maisRecente.siglaUf,
          urlFoto: maisRecente.urlFoto,
          nomeEleitoral: maisRecente.nomeEleitoral,
          partido: partido.sigla,
        })
        .from(maisRecente)
        .innerJoin(deputado, eq(maisRecente.deputadoId, deputado.id))
        .leftJoin(partido, eq(maisRecente.partidoId, partido.id));

      const estado =
        escopo === 'nacional'
          ? await base
          : await base.where(eq(maisRecente.siglaUf, siglaUf));

      const deputadoIds = estado.map((row) => row.deputadoId);
      if (deputadoIds.length === 0) {
        return [];
      }

      const intervalosByDeputado = await loadIntervalosByDeputado(
        db,
        deputadoIds,
      );

      return estado.map((row) => ({
        deputadoId: row.deputadoId,
        externalIdDeputado: row.externalIdDeputado,
        nome: row.nome,
        nomeEleitoral: row.nomeEleitoral,
        nomeCivil: row.nomeCivil,
        partido: row.partido,
        siglaUf: row.siglaUf as SiglaUf,
        urlFoto: row.urlFoto,
        intervalos: intervalosByDeputado.get(row.deputadoId) ?? [],
      }));
    },

    async loadDeputadoByExternalIdWithHistorico(
      escopo,
      siglaUf,
      externalIdDeputado,
    ) {
      const [maisRecente] = await db
        .select({
          deputadoId: deputado.id,
          externalIdDeputado: deputado.externalIdDeputado,
          nome: deputado.nome,
          nomeCivil: deputado.nomeCivil,
          nomeEleitoral: deputadoHistorico.nomeEleitoral,
          siglaUf: deputadoHistorico.siglaUf,
          urlFoto: deputadoHistorico.urlFoto,
          partido: partido.sigla,
        })
        .from(deputado)
        .innerJoin(
          deputadoHistorico,
          eq(deputadoHistorico.deputadoId, deputado.id),
        )
        .leftJoin(partido, eq(deputadoHistorico.partidoId, partido.id))
        .where(eq(deputado.externalIdDeputado, externalIdDeputado))
        .orderBy(desc(deputadoHistorico.dataHora))
        .limit(1);

      if (maisRecente === undefined) {
        return null;
      }
      if (escopo === 'estadual' && maisRecente.siglaUf !== siglaUf) {
        return null;
      }

      const intervalosByDeputado = await loadIntervalosByDeputado(db, [
        maisRecente.deputadoId,
      ]);

      return {
        deputadoId: maisRecente.deputadoId,
        externalIdDeputado: maisRecente.externalIdDeputado,
        nome: maisRecente.nome,
        nomeEleitoral: maisRecente.nomeEleitoral,
        nomeCivil: maisRecente.nomeCivil,
        partido: maisRecente.partido,
        siglaUf: maisRecente.siglaUf as SiglaUf,
        urlFoto: maisRecente.urlFoto,
        intervalos: intervalosByDeputado.get(maisRecente.deputadoId) ?? [],
      };
    },
  };
}
