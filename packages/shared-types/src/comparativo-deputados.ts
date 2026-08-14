import { z } from "zod";

import {
  deputadoLegislaturaPeriodoSchema,
  deputadoOrgaosResponseSchema,
  deputadoProposicoesAssinadasResponseSchema,
  deputadoResumoPresencaSchema,
  deputadoSnapshotPublicoSchema,
} from "./deputados";

export const MIN_COMPARATIVO_DEPUTADOS = 2;
export const MAX_COMPARATIVO_DEPUTADOS = 3;

export const comparativoCotaStatusSchema = z.enum([
  "comparavel",
  "sem-comparacao",
  "ano-nao-carregado",
]);

export const comparativoCotaSemComparacaoMotivoSchema = z.enum([
  "exercicio-parcial",
  "dado-incompleto",
  "sem-gastos",
]);

// A mediana chega sem o valor absoluto: com ele, o percentual de cada deputado
// devolveria o gasto nominal de todos os comparados da mesma UF.
export const comparativoCotaMedianaUfSchema = z.object({
  siglaUf: z.string().length(2),
  deputadoCount: z.number().int().positive(),
});

export const comparativoCotaSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal(comparativoCotaStatusSchema.enum.comparavel),
    percentualSobreMedianaUf: z.number(),
    medianaUf: comparativoCotaMedianaUfSchema,
  }),
  z.object({
    status: z.literal(comparativoCotaStatusSchema.enum["sem-comparacao"]),
    motivo: comparativoCotaSemComparacaoMotivoSchema,
  }),
  z.object({
    status: z.literal(comparativoCotaStatusSchema.enum["ano-nao-carregado"]),
  }),
]);

export const comparativoDeputadoSchema = z
  .object({
    externalIdDeputado: z.number().int().positive(),
    nomePublico: z.string().nullable(),
    nomeCivil: z.string().nullable(),
    fonteOficial: z.string(),
    emAtividade: z.boolean(),
    snapshotPublicoDisponivel: z.boolean(),
    snapshotPublico: deputadoSnapshotPublicoSchema.nullable(),
    legislaturaInicialPeriodo: deputadoLegislaturaPeriodoSchema.nullable(),
    legislaturaFinalPeriodo: deputadoLegislaturaPeriodoSchema.nullable(),
    resumoPresencaDisponivel: z.boolean(),
    resumoPresenca: deputadoResumoPresencaSchema.nullable(),
    proposicoesAssinadas: deputadoProposicoesAssinadasResponseSchema.nullable(),
    orgaos: deputadoOrgaosResponseSchema.nullable(),
    cota: comparativoCotaSchema.nullable(),
  })
  .superRefine((item, ctx) => {
    if (item.snapshotPublicoDisponivel === (item.snapshotPublico === null)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["snapshotPublico"],
        message:
          "snapshotPublicoDisponivel deve coincidir com a presença de snapshotPublico",
      });
    }

    if (item.resumoPresencaDisponivel === (item.resumoPresenca === null)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["resumoPresenca"],
        message:
          "resumoPresencaDisponivel deve coincidir com a presença de resumoPresenca",
      });
    }

    const semMetricasAnuais = [
      item.proposicoesAssinadas,
      item.orgaos,
      item.cota,
    ].filter((metrica) => metrica === null).length;
    if (semMetricasAnuais !== 0 && semMetricasAnuais !== 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cota"],
        message: "as métricas do ano devem estar disponíveis juntas",
      });
    }
  });

export const comparativoDeputadosResponseSchema = z
  .object({
    year: z.number().int().nullable(),
    comparableYears: z.array(z.number().int()),
    items: z
      .array(comparativoDeputadoSchema)
      .min(MIN_COMPARATIVO_DEPUTADOS)
      .max(MAX_COMPARATIVO_DEPUTADOS),
  })
  .superRefine((response, ctx) => {
    if ((response.year === null) !== (response.comparableYears.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["year"],
        message: "year e comparableYears devem estar disponíveis juntos",
      });
    }

    if (
      response.year !== null &&
      !response.comparableYears.includes(response.year)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["year"],
        message: "year deve pertencer a comparableYears",
      });
    }

    const externalIdsDeputado = response.items.map(
      (item) => item.externalIdDeputado,
    );
    if (new Set(externalIdsDeputado).size !== externalIdsDeputado.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["items"],
        message: "items não pode repetir o mesmo deputado",
      });
    }

    response.items.forEach((item, index) => {
      if ((item.cota === null) !== (response.year === null)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["items", index, "cota"],
          message:
            "as métricas do ano acompanham a presença de um ano comparável",
        });
      }

      if (response.year === null) return;

      if (
        item.proposicoesAssinadas !== null &&
        item.proposicoesAssinadas.year !== response.year
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["items", index, "proposicoesAssinadas"],
          message: "proposicoesAssinadas deve usar o ano aplicado",
        });
      }

      if (item.orgaos !== null && item.orgaos.year !== response.year) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["items", index, "orgaos"],
          message: "orgaos deve usar o ano aplicado",
        });
      }
    });
  });

export type ComparativoCotaStatus = z.infer<typeof comparativoCotaStatusSchema>;
export type ComparativoCotaSemComparacaoMotivo = z.infer<
  typeof comparativoCotaSemComparacaoMotivoSchema
>;
export type ComparativoCotaMedianaUf = z.infer<
  typeof comparativoCotaMedianaUfSchema
>;
export type ComparativoCota = z.infer<typeof comparativoCotaSchema>;
export type ComparativoDeputado = z.infer<typeof comparativoDeputadoSchema>;
export type ComparativoDeputadosResponse = z.infer<
  typeof comparativoDeputadosResponseSchema
>;
