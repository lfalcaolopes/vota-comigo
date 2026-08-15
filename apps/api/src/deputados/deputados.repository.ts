import {
  and,
  asc,
  desc,
  eq,
  exists,
  gt,
  gte,
  inArray,
  isNotNull,
  isNull,
  lte,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

import type { DrizzleDatabase } from '@/shared/database/client';
import {
  cotaCategoria,
  cotaCobertura,
  cotaMedianaUf,
  deputado,
  deputadoExercicioIntervalo,
  deputadoHistorico,
  deputadoOrgao,
  deputadoPresenca,
  deputadoGastoCota,
  deputadoProposicaoAssinada,
  legislatura,
  orgao,
  partido,
} from '@/shared/database/schema';

import {
  normalizeSearchText,
  normalizedColumn,
  toLikePattern,
} from './rules/texto-normalizado';
import type { IntervaloExercicio } from '@/exercicio/types/exercicio.types';

import type {
  DeputadoCardRow,
  DeputadoCeapSource,
  DeputadoCotaJanelaSource,
  DeputadoProposicoesAssinadasJanelaSource,
  DeputadoLegislaturaPeriodoSource,
  DeputadosFeedFilters,
  DeputadosFeedPage,
  DeputadosFeedPagination,
  DeputadoOrgaoSource,
  DeputadoPerfilSource,
  DeputadoProposicoesAssinadasSource,
  DeputadoResumoPresencaRow,
  LegislaturaSource,
} from './types/deputados.types';

export const DEPUTADOS_REPOSITORY = Symbol('DEPUTADOS_REPOSITORY');

export interface DeputadosRepository {
  loadDeputadosFeed(
    filters: DeputadosFeedFilters,
    pagination: DeputadosFeedPagination,
  ): Promise<DeputadosFeedPage>;
  loadUfsDisponiveis(): Promise<readonly string[]>;
  loadPartidosDisponiveis(): Promise<readonly string[]>;
  loadDeputadoPerfil(
    externalIdDeputado: number,
  ): Promise<DeputadoPerfilSource | null>;
  loadResumoPresenca(
    deputadoId: string,
  ): Promise<DeputadoResumoPresencaRow | null>;
  loadDeputadoCeapSource(
    deputadoId: string,
    year: number,
  ): Promise<DeputadoCeapSource>;
  loadDeputadoCotaJanelaSource(
    deputadoId: string,
    years: readonly number[],
  ): Promise<DeputadoCotaJanelaSource>;
  loadDeputadoOrgaos(
    deputadoId: string,
    year: number,
  ): Promise<readonly DeputadoOrgaoSource[]>;
  loadDeputadoOrgaosNaJanela(
    deputadoId: string,
    dataInicio: string,
    dataFim: string,
  ): Promise<readonly DeputadoOrgaoSource[]>;
  loadDeputadoProposicoesAssinadasSource(
    deputadoId: string,
    year: number,
  ): Promise<DeputadoProposicoesAssinadasSource>;
  loadDeputadoProposicoesAssinadasJanela(
    deputadoId: string,
    years: readonly number[],
  ): Promise<DeputadoProposicoesAssinadasJanelaSource>;
  loadLegislaturas(): Promise<readonly LegislaturaSource[]>;
  loadIntervalosExercicio(
    deputadoId: string,
  ): Promise<readonly IntervaloExercicio[]>;
}

function toLegislaturaPeriodoSource(
  dataInicio: string | null,
  dataFim: string | null,
): DeputadoLegislaturaPeriodoSource | null {
  if (dataInicio === null || dataFim === null) {
    return null;
  }

  return { dataInicio, dataFim };
}

export function createDeputadosRepository(
  db: DrizzleDatabase,
): DeputadosRepository {
  // O DISTINCT ON tem de ficar sozinho sobre deputado_historico: qualquer join
  // aqui dentro faz o planner trocar o index scan por sort, perdendo o indice
  // que cobre exatamente estas colunas.
  function snapshotPublico() {
    return db
      .selectDistinctOn([deputadoHistorico.deputadoId], {
        deputadoId: deputadoHistorico.deputadoId,
        nomeEleitoral: deputadoHistorico.nomeEleitoral,
        siglaUf: deputadoHistorico.siglaUf,
        urlFoto: deputadoHistorico.urlFoto,
        partidoId: deputadoHistorico.partidoId,
      })
      .from(deputadoHistorico)
      .orderBy(deputadoHistorico.deputadoId, desc(deputadoHistorico.dataHora))
      .as('snapshot');
  }

  async function loadLegislaturasRows(): Promise<readonly LegislaturaSource[]> {
    const rows = await db
      .select({
        externalIdLegislatura: legislatura.externalIdLegislatura,
        dataInicio: legislatura.dataInicio,
        dataFim: legislatura.dataFim,
      })
      .from(legislatura)
      .where(
        and(isNotNull(legislatura.dataInicio), isNotNull(legislatura.dataFim)),
      );

    return rows.flatMap((row) =>
      row.dataInicio === null || row.dataFim === null
        ? []
        : [
            {
              externalIdLegislatura: row.externalIdLegislatura,
              dataInicio: row.dataInicio,
              dataFim: row.dataFim,
            },
          ],
    );
  }

  function loadIntervalosExercicioRows(deputadoId: string) {
    return db
      .select({
        openedAt: deputadoExercicioIntervalo.openedAt,
        closedAt: deputadoExercicioIntervalo.closedAt,
      })
      .from(deputadoExercicioIntervalo)
      .where(eq(deputadoExercicioIntervalo.deputadoId, deputadoId));
  }

  async function loadEventosByDeputadoId(deputadoId: string) {
    return db
      .select({
        dataHora: deputadoHistorico.dataHora,
        situacao: deputadoHistorico.situacao,
        descricaoStatus: deputadoHistorico.descricaoStatus,
        nomeEleitoral: deputadoHistorico.nomeEleitoral,
        siglaUf: deputadoHistorico.siglaUf,
        urlFoto: deputadoHistorico.urlFoto,
        siglaPartido: partido.sigla,
      })
      .from(deputadoHistorico)
      .leftJoin(partido, eq(deputadoHistorico.partidoId, partido.id))
      .where(eq(deputadoHistorico.deputadoId, deputadoId));
  }

  return {
    async loadDeputadosFeed(filters, pagination) {
      const snapshot = snapshotPublico();

      const nomePublico = sql<
        string | null
      >`coalesce(${snapshot.nomeEleitoral}, ${deputado.nome}, ${deputado.nomeCivil})`;

      // deputado_exercicio_intervalo e deriveIntervalosExercicio persistido;
      // um intervalo em aberto e exatamente isEmAtividade.
      const emAtividade = exists(
        db
          .select({ one: sql`1` })
          .from(deputadoExercicioIntervalo)
          .where(
            and(
              eq(deputadoExercicioIntervalo.deputadoId, deputado.id),
              isNull(deputadoExercicioIntervalo.closedAt),
            ),
          ),
      );

      const conditions: SQL[] = [];
      if (filters.emAtividade === true) {
        conditions.push(emAtividade);
      }
      if (filters.uf !== undefined) {
        conditions.push(eq(snapshot.siglaUf, filters.uf));
      }
      if (filters.partido !== undefined) {
        conditions.push(
          sql`${normalizedColumn(sql`trim(${partido.sigla})`)} = ${normalizeSearchText(filters.partido.trim())}`,
        );
      }
      if (filters.q !== undefined && filters.q.trim().length > 0) {
        const pattern = toLikePattern(normalizeSearchText(filters.q.trim()));
        conditions.push(
          sql`(${normalizedColumn(nomePublico)} like ${pattern} or ${normalizedColumn(deputado.nomeCivil)} like ${pattern})`,
        );
      }

      const ordenacao = normalizedColumn(nomePublico);
      const rows = await db
        .select({
          externalIdDeputado: deputado.externalIdDeputado,
          nomePublico,
          nomeCivil: deputado.nomeCivil,
          siglaPartido: partido.sigla,
          siglaUf: snapshot.siglaUf,
          urlFoto: snapshot.urlFoto,
          emAtividade: sql<boolean>`${emAtividade}`,
          total: sql<string>`count(*) over ()`,
        })
        .from(deputado)
        .innerJoin(
          deputadoPresenca,
          and(
            eq(deputadoPresenca.deputadoId, deputado.id),
            gt(deputadoPresenca.presencas, 0),
          ),
        )
        .leftJoin(snapshot, eq(snapshot.deputadoId, deputado.id))
        .leftJoin(partido, eq(partido.id, snapshot.partidoId))
        .where(conditions.length === 0 ? undefined : and(...conditions))
        .orderBy(sql`${ordenacao} asc nulls last`, deputado.externalIdDeputado)
        .limit(pagination.limit)
        .offset(pagination.offset);

      const items: DeputadoCardRow[] = rows.map((row) => ({
        externalIdDeputado: row.externalIdDeputado,
        nomePublico: row.nomePublico,
        nomeCivil: row.nomeCivil,
        siglaPartido: row.siglaPartido,
        siglaUf: row.siglaUf,
        urlFoto: row.urlFoto,
        emAtividade: row.emAtividade,
      }));

      return { items, total: Number(rows.at(0)?.total ?? 0) };
    },

    async loadUfsDisponiveis() {
      const snapshot = snapshotPublico();

      const rows = await db
        .selectDistinct({ siglaUf: snapshot.siglaUf })
        .from(snapshot)
        .innerJoin(
          deputadoPresenca,
          and(
            eq(deputadoPresenca.deputadoId, snapshot.deputadoId),
            gt(deputadoPresenca.presencas, 0),
          ),
        )
        .where(isNotNull(snapshot.siglaUf));

      return rows.flatMap((row) => (row.siglaUf === null ? [] : [row.siglaUf]));
    },

    async loadPartidosDisponiveis() {
      const snapshot = snapshotPublico();

      const rows = await db
        .selectDistinct({ sigla: partido.sigla })
        .from(snapshot)
        .innerJoin(
          deputadoPresenca,
          and(
            eq(deputadoPresenca.deputadoId, snapshot.deputadoId),
            gt(deputadoPresenca.presencas, 0),
          ),
        )
        .innerJoin(partido, eq(partido.id, snapshot.partidoId))
        .where(isNotNull(partido.sigla));

      return rows.flatMap((row) => (row.sigla === null ? [] : [row.sigla]));
    },

    async loadDeputadoPerfil(externalIdDeputado) {
      const legislaturaInicial = alias(legislatura, 'legislatura_inicial');
      const legislaturaFinal = alias(legislatura, 'legislatura_final');

      const [row] = await db
        .select({
          id: deputado.id,
          externalIdDeputado: deputado.externalIdDeputado,
          nome: deputado.nome,
          nomeCivil: deputado.nomeCivil,
          dataNascimento: deputado.dataNascimento,
          municipioNascimento: deputado.municipioNascimento,
          ufNascimento: deputado.ufNascimento,
          urlRedeSocial: deputado.urlRedeSocial,
          externalIdLegislaturaInicial:
            legislaturaInicial.externalIdLegislatura,
          externalIdLegislaturaFinal: legislaturaFinal.externalIdLegislatura,
          legislaturaInicialDataInicio: legislaturaInicial.dataInicio,
          legislaturaInicialDataFim: legislaturaInicial.dataFim,
          legislaturaFinalDataInicio: legislaturaFinal.dataInicio,
          legislaturaFinalDataFim: legislaturaFinal.dataFim,
        })
        .from(deputado)
        .leftJoin(
          legislaturaInicial,
          eq(deputado.legislaturaInicialId, legislaturaInicial.id),
        )
        .leftJoin(
          legislaturaFinal,
          eq(deputado.legislaturaFinalId, legislaturaFinal.id),
        )
        .where(eq(deputado.externalIdDeputado, externalIdDeputado))
        .limit(1);

      if (row === undefined) {
        return null;
      }

      return {
        id: row.id,
        externalIdDeputado: row.externalIdDeputado,
        nome: row.nome,
        nomeCivil: row.nomeCivil,
        dataNascimento: row.dataNascimento,
        municipioNascimento: row.municipioNascimento,
        ufNascimento: row.ufNascimento,
        urlRedeSocial: row.urlRedeSocial,
        externalIdLegislaturaInicial: row.externalIdLegislaturaInicial ?? null,
        externalIdLegislaturaFinal: row.externalIdLegislaturaFinal ?? null,
        legislaturaInicialPeriodo: toLegislaturaPeriodoSource(
          row.legislaturaInicialDataInicio,
          row.legislaturaInicialDataFim,
        ),
        legislaturaFinalPeriodo: toLegislaturaPeriodoSource(
          row.legislaturaFinalDataInicio,
          row.legislaturaFinalDataFim,
        ),
        eventos: await loadEventosByDeputadoId(row.id),
      };
    },

    async loadResumoPresenca(deputadoId) {
      const [row] = await db
        .select({
          presencas: deputadoPresenca.presencas,
          ausenciasSemMotivoConhecido:
            deputadoPresenca.ausenciasSemMotivoConhecido,
        })
        .from(deputadoPresenca)
        .where(eq(deputadoPresenca.deputadoId, deputadoId))
        .limit(1);

      return row ?? null;
    },

    async loadDeputadoCeapSource(deputadoId, year) {
      const [
        coberturas,
        gastoRows,
        categorias,
        intervalosExercicio,
        legislaturas,
      ] = await Promise.all([
        db
          .select({
            year: cotaCobertura.year,
            coveredThroughMonth: cotaCobertura.coveredThroughMonth,
          })
          .from(cotaCobertura)
          .orderBy(asc(cotaCobertura.year)),
        db
          .select({
            siglaUf: deputadoGastoCota.siglaUf,
            gastosJson: deputadoGastoCota.gastosJson,
          })
          .from(deputadoGastoCota)
          .where(
            and(
              eq(deputadoGastoCota.deputadoId, deputadoId),
              eq(deputadoGastoCota.year, year),
            ),
          )
          .limit(1),
        db
          .select({
            externalNumSubCota: cotaCategoria.externalNumSubCota,
            description: cotaCategoria.descricao,
          })
          .from(cotaCategoria)
          .orderBy(asc(cotaCategoria.externalNumSubCota)),
        loadIntervalosExercicioRows(deputadoId),
        loadLegislaturasRows(),
      ]);

      const gastoRow = gastoRows[0];
      const medianaRows =
        gastoRow === undefined
          ? []
          : await db
              .select({
                amountUsedCents: cotaMedianaUf.valorUtilizadoMediana,
                deputadoCount: cotaMedianaUf.deputadoCount,
              })
              .from(cotaMedianaUf)
              .where(
                and(
                  eq(cotaMedianaUf.year, year),
                  eq(cotaMedianaUf.siglaUf, gastoRow.siglaUf),
                ),
              )
              .limit(1);

      return {
        coberturas,
        gasto:
          gastoRow === undefined
            ? null
            : {
                siglaUf: gastoRow.siglaUf,
                gastosJson: gastoRow.gastosJson as Record<
                  string,
                  Record<string, number>
                >,
              },
        categorias,
        medianaUf: medianaRows[0] ?? null,
        intervalosExercicio,
        datasInicioLegislatura: legislaturas.map(
          (legislaturaRow) => legislaturaRow.dataInicio,
        ),
      };
    },

    async loadDeputadoCotaJanelaSource(deputadoId, years) {
      const [coberturas, gastoRows, intervalosExercicio, legislaturas] =
        await Promise.all([
          db
            .select({
              year: cotaCobertura.year,
              coveredThroughMonth: cotaCobertura.coveredThroughMonth,
            })
            .from(cotaCobertura)
            .where(inArray(cotaCobertura.year, [...years])),
          db
            .select({
              year: deputadoGastoCota.year,
              siglaUf: deputadoGastoCota.siglaUf,
              gastosJson: deputadoGastoCota.gastosJson,
            })
            .from(deputadoGastoCota)
            .where(
              and(
                eq(deputadoGastoCota.deputadoId, deputadoId),
                inArray(deputadoGastoCota.year, [...years]),
              ),
            ),
          loadIntervalosExercicioRows(deputadoId),
          loadLegislaturasRows(),
        ]);

      const siglaUf =
        [...gastoRows].sort((a, b) => b.year - a.year)[0]?.siglaUf ?? null;
      const medianaRows =
        siglaUf === null
          ? []
          : await db
              .select({
                year: cotaMedianaUf.year,
                amountUsedCents: cotaMedianaUf.valorUtilizadoMediana,
                deputadoCount: cotaMedianaUf.deputadoCount,
              })
              .from(cotaMedianaUf)
              .where(
                and(
                  eq(cotaMedianaUf.siglaUf, siglaUf),
                  inArray(cotaMedianaUf.year, [...years]),
                ),
              );

      return {
        siglaUf,
        anos: years.map((year) => {
          const mediana = medianaRows.find((row) => row.year === year);
          return {
            year,
            coveredThroughMonth:
              coberturas.find((row) => row.year === year)
                ?.coveredThroughMonth ?? null,
            gastosJson:
              (gastoRows.find((row) => row.year === year)?.gastosJson as
                | Record<string, Record<string, number>>
                | undefined) ?? null,
            medianaUf:
              mediana === undefined
                ? null
                : {
                    amountUsedCents: mediana.amountUsedCents,
                    deputadoCount: mediana.deputadoCount,
                  },
          };
        }),
        intervalosExercicio,
        datasInicioLegislatura: legislaturas.map(
          (legislaturaRow) => legislaturaRow.dataInicio,
        ),
      };
    },

    async loadDeputadoOrgaosNaJanela(deputadoId, dataInicio, dataFim) {
      const rows = await db
        .select({
          externalIdOrgao: orgao.externalIdOrgao,
          siglaOrgao: orgao.sigla,
          nomePublicacao: orgao.nomePublicacao,
          nome: orgao.nome,
          titulo: deputadoOrgao.cargo,
          dataInicio: deputadoOrgao.dataInicio,
          dataFim: deputadoOrgao.dataFim,
        })
        .from(deputadoOrgao)
        .innerJoin(orgao, eq(orgao.id, deputadoOrgao.orgaoId))
        .where(
          and(
            eq(deputadoOrgao.deputadoId, deputadoId),
            lte(deputadoOrgao.dataInicio, dataFim),
            or(
              isNull(deputadoOrgao.dataFim),
              gte(deputadoOrgao.dataFim, dataInicio),
            ),
          ),
        );

      return rows.map((row) => ({
        externalIdOrgao: row.externalIdOrgao,
        siglaOrgao: row.siglaOrgao,
        nome: row.nomePublicacao?.trim() || row.nome,
        titulo: row.titulo,
        dataInicio: row.dataInicio,
        dataFim: row.dataFim,
      }));
    },

    async loadDeputadoProposicoesAssinadasJanela(deputadoId, years) {
      const [coberturaRows, deputadoRows, fronteiraRows] = await Promise.all([
        db
          .selectDistinct({ year: deputadoProposicaoAssinada.year })
          .from(deputadoProposicaoAssinada)
          .where(inArray(deputadoProposicaoAssinada.year, [...years])),
        db
          .select({
            year: deputadoProposicaoAssinada.year,
            assinaturasJson: deputadoProposicaoAssinada.assinaturasJson,
          })
          .from(deputadoProposicaoAssinada)
          .where(
            and(
              eq(deputadoProposicaoAssinada.deputadoId, deputadoId),
              inArray(deputadoProposicaoAssinada.year, [...years]),
            ),
          ),
        // A fronteira da fonte é o dia mais recente varrido pela ingestão, e
        // ele vive no ano mais recente carregado — não nos anos da janela.
        db.execute<{ coveredThroughDate: string | null }>(sql`
          select max(assinatura.key) as "coveredThroughDate"
          from ${deputadoProposicaoAssinada} as assinada,
               jsonb_each(assinada.assinaturas_json) as assinatura
          where assinada.year = (
            select max(year) from ${deputadoProposicaoAssinada}
          )
        `),
      ]);

      return {
        anos: years.map((year) => ({
          year,
          coberto: coberturaRows.some((row) => row.year === year),
          assinaturasJson:
            (deputadoRows.find((row) => row.year === year)
              ?.assinaturasJson as DeputadoProposicoesAssinadasSource['assinaturasJson']) ??
            null,
        })),
        coveredThroughDate: fronteiraRows[0]?.coveredThroughDate ?? null,
      };
    },

    async loadDeputadoOrgaos(deputadoId, year) {
      const yearStart = `${year}-01-01`;
      const yearEnd = `${year}-12-31`;

      const rows = await db
        .select({
          externalIdOrgao: orgao.externalIdOrgao,
          siglaOrgao: orgao.sigla,
          nomePublicacao: orgao.nomePublicacao,
          nome: orgao.nome,
          titulo: deputadoOrgao.cargo,
          dataInicio: deputadoOrgao.dataInicio,
          dataFim: deputadoOrgao.dataFim,
        })
        .from(deputadoOrgao)
        .innerJoin(orgao, eq(orgao.id, deputadoOrgao.orgaoId))
        .where(
          and(
            eq(deputadoOrgao.deputadoId, deputadoId),
            lte(deputadoOrgao.dataInicio, yearEnd),
            or(
              isNull(deputadoOrgao.dataFim),
              gte(deputadoOrgao.dataFim, yearStart),
            ),
          ),
        );

      return rows.map((row) => ({
        externalIdOrgao: row.externalIdOrgao,
        siglaOrgao: row.siglaOrgao,
        nome: row.nomePublicacao?.trim() || row.nome,
        titulo: row.titulo,
        dataInicio: row.dataInicio,
        dataFim: row.dataFim,
      }));
    },

    async loadDeputadoProposicoesAssinadasSource(deputadoId, year) {
      const [coberturaRows, deputadoRows, fronteiraRows] = await Promise.all([
        db
          .select({ year: deputadoProposicaoAssinada.year })
          .from(deputadoProposicaoAssinada)
          .where(eq(deputadoProposicaoAssinada.year, year))
          .limit(1),
        db
          .select({
            assinaturasJson: deputadoProposicaoAssinada.assinaturasJson,
          })
          .from(deputadoProposicaoAssinada)
          .where(
            and(
              eq(deputadoProposicaoAssinada.deputadoId, deputadoId),
              eq(deputadoProposicaoAssinada.year, year),
            ),
          )
          .limit(1),
        // A fronteira da fonte é o dia mais recente varrido pela ingestão, e
        // ele vive no ano mais recente carregado — não no ano consultado.
        db.execute<{ coveredThroughDate: string | null }>(sql`
          select max(assinatura.key) as "coveredThroughDate"
          from ${deputadoProposicaoAssinada} as assinada,
               jsonb_each(assinada.assinaturas_json) as assinatura
          where assinada.year = (
            select max(year) from ${deputadoProposicaoAssinada}
          )
        `),
      ]);

      return {
        anoCoberto: coberturaRows.length > 0,
        assinaturasJson:
          (deputadoRows[0]
            ?.assinaturasJson as DeputadoProposicoesAssinadasSource['assinaturasJson']) ??
          null,
        coveredThroughDate: fronteiraRows[0]?.coveredThroughDate ?? null,
      };
    },

    async loadLegislaturas() {
      return loadLegislaturasRows();
    },

    async loadIntervalosExercicio(deputadoId) {
      return loadIntervalosExercicioRows(deputadoId);
    },
  };
}
