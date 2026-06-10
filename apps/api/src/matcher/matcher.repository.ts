import { and, desc, eq, inArray } from 'drizzle-orm';
import type {
  EscopoMatcher,
  SiglaUf,
  VotoCategoria,
} from '@vota-comigo/shared-types';

import { toProposicoesComputaveis } from '@/proposicoes/rules/proposicoes-computaveis';
import type { ProposicaoVotacaoJoinRow } from '@/proposicoes/proposicoes.repository';
import {
  toProposicaoCard,
  toVotacaoReferenciaResumo,
} from '@/proposicoes/mappers/proposicao-card.mapper';
import type { DrizzleDatabase } from '@/shared/database/client';
import {
  deputado,
  deputadoHistorico,
  partido,
  proposicao,
  votacao,
  votacaoProposicao,
  votacaoVotos,
} from '@/shared/database/schema';

import type {
  DeputadoCompatibilidadeInput,
  VotacaoReferenciaVotos,
} from './types/compatibilidade.types';

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

function selectProposicaoVotacaoJoin(
  db: DrizzleDatabase,
  externalIdProposicoes: readonly number[],
) {
  return db
    .select({
      externalIdProposicao: proposicao.externalIdProposicao,
      siglaTipo: proposicao.siglaTipo,
      numero: proposicao.numero,
      ano: proposicao.ano,
      ementa: proposicao.ementa,
      dataApresentacao: proposicao.dataApresentacao,
      ultimoStatusSiglaOrgao: proposicao.ultimoStatusSiglaOrgao,
      ultimoStatusDescricaoSituacao: proposicao.ultimoStatusDescricaoSituacao,
      ultimoStatusRegime: proposicao.ultimoStatusRegime,
      ultimoStatusDataHora: proposicao.ultimoStatusDataHora,
      externalIdVotacao: votacao.externalIdVotacao,
      data: votacao.data,
      dataHoraRegistro: votacao.dataHoraRegistro,
      descricao: votacao.descricao,
      ultimaAberturaVotacaoDescricao: votacao.ultimaAberturaVotacaoDescricao,
      ultimaApresentacaoProposicaoDescricao:
        votacao.ultimaApresentacaoProposicaoDescricao,
      votosSim: votacao.votosSim,
      votosNao: votacao.votosNao,
      votosOutros: votacao.votosOutros,
      aprovacao: votacao.aprovacao,
    })
    .from(votacaoProposicao)
    .innerJoin(votacao, eq(votacaoProposicao.votacaoId, votacao.id))
    .innerJoin(proposicao, eq(votacaoProposicao.proposicaoId, proposicao.id))
    .where(
      and(
        eq(votacao.escopoVotacao, 'plenario'),
        inArray(proposicao.externalIdProposicao, [...externalIdProposicoes]),
      ),
    );
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

      const rows: ProposicaoVotacaoJoinRow[] =
        await selectProposicaoVotacaoJoin(db, externalIdProposicoes);

      return new Set(
        toProposicoesComputaveis(rows).map(
          (ranked) => ranked.proposicao.externalIdProposicao,
        ),
      );
    },

    async loadVotacoesReferenciaWithVotos(externalIdProposicoes) {
      if (externalIdProposicoes.length === 0) {
        return [];
      }

      const rows: ProposicaoVotacaoJoinRow[] =
        await selectProposicaoVotacaoJoin(db, externalIdProposicoes);
      const ranked = toProposicoesComputaveis(rows);
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
          partidoId: deputadoHistorico.partidoId,
        })
        .from(deputadoHistorico)
        .orderBy(deputadoHistorico.deputadoId, desc(deputadoHistorico.dataHora))
        .as('mais_recente');

      const base = db
        .select({
          deputadoId: maisRecente.deputadoId,
          siglaUf: maisRecente.siglaUf,
          urlFoto: maisRecente.urlFoto,
          partido: partido.sigla,
        })
        .from(maisRecente)
        .leftJoin(partido, eq(maisRecente.partidoId, partido.id));

      const estado =
        escopo === 'nacional'
          ? await base
          : await base.where(eq(maisRecente.siglaUf, siglaUf));

      const deputadoIds = estado.map((row) => row.deputadoId);
      if (deputadoIds.length === 0) {
        return [];
      }

      const historico = await db
        .select({
          deputadoId: deputadoHistorico.deputadoId,
          externalIdDeputado: deputado.externalIdDeputado,
          nome: deputado.nome,
          dataHora: deputadoHistorico.dataHora,
          situacao: deputadoHistorico.situacao,
          descricaoStatus: deputadoHistorico.descricaoStatus,
          partido: partido.sigla,
        })
        .from(deputadoHistorico)
        .innerJoin(deputado, eq(deputadoHistorico.deputadoId, deputado.id))
        .leftJoin(partido, eq(deputadoHistorico.partidoId, partido.id))
        .where(inArray(deputadoHistorico.deputadoId, deputadoIds));

      const historicoByDeputado = new Map<
        string,
        {
          externalIdDeputado: number;
          nome: string | null;
          eventos: {
            dataHora: string;
            situacao: string | null;
            descricaoStatus: string;
            partido: string | null;
          }[];
        }
      >();

      for (const row of historico) {
        const existing = historicoByDeputado.get(row.deputadoId);
        const evento = {
          dataHora: row.dataHora,
          situacao: row.situacao,
          descricaoStatus: row.descricaoStatus,
          partido: row.partido,
        };
        if (existing === undefined) {
          historicoByDeputado.set(row.deputadoId, {
            externalIdDeputado: row.externalIdDeputado,
            nome: row.nome,
            eventos: [evento],
          });
        } else {
          existing.eventos.push(evento);
        }
      }

      return estado.flatMap((row) => {
        const found = historicoByDeputado.get(row.deputadoId);
        if (found === undefined) {
          return [];
        }
        return [
          {
            deputadoId: row.deputadoId,
            externalIdDeputado: found.externalIdDeputado,
            nome: found.nome,
            partido: row.partido,
            siglaUf: row.siglaUf as SiglaUf,
            urlFoto: row.urlFoto,
            eventos: found.eventos,
          },
        ];
      });
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

      const historico = await db
        .select({
          dataHora: deputadoHistorico.dataHora,
          situacao: deputadoHistorico.situacao,
          descricaoStatus: deputadoHistorico.descricaoStatus,
          partido: partido.sigla,
        })
        .from(deputadoHistorico)
        .leftJoin(partido, eq(deputadoHistorico.partidoId, partido.id))
        .where(eq(deputadoHistorico.deputadoId, maisRecente.deputadoId));

      return {
        deputadoId: maisRecente.deputadoId,
        externalIdDeputado: maisRecente.externalIdDeputado,
        nome: maisRecente.nome,
        partido: maisRecente.partido,
        siglaUf: maisRecente.siglaUf as SiglaUf,
        urlFoto: maisRecente.urlFoto,
        eventos: historico,
      };
    },
  };
}
