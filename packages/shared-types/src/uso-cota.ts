import { z } from "zod";

export const deputadoSortSchema = z.enum([
  "nome",
  "compatibilidade",
  "menor-uso-cota",
]);

export const deputadoFeedSortSchema = deputadoSortSchema.exclude([
  "compatibilidade",
]);
export const matcherSortSchema = deputadoSortSchema.exclude(["nome"]);

export const usoCotaIndisponivelMotivoSchema = z.enum([
  "sem-legislatura-com-exercicio",
  "legislatura-anterior-a-cobertura",
  "intervalo-exercicio-ausente",
  "intervalo-exercicio-inconsistente",
  "uf-ausente-ou-inconsistente",
  "teto-base-ausente-ou-zero",
  "fonte-incompleta",
  "sigepa-incompleto",
]);

export const usoCotaResumoSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("calculavel"),
    percentualTetoBase: z.number(),
    legislatura: z.number().int().positive(),
    periodStart: z.iso.date(),
    coberturaAte: z.iso.date(),
    diasEmExercicio: z.number().int().nonnegative(),
  }),
  z.object({
    status: z.literal("indisponivel"),
    legislatura: z.number().int().positive().nullable(),
    motivo: usoCotaIndisponivelMotivoSchema,
  }),
]);

export type DeputadoSort = z.infer<typeof deputadoSortSchema>;
export type DeputadoFeedSort = z.infer<typeof deputadoFeedSortSchema>;
export type MatcherSort = z.infer<typeof matcherSortSchema>;
export type UsoCotaIndisponivelMotivo = z.infer<
  typeof usoCotaIndisponivelMotivoSchema
>;
export type UsoCotaResumo = z.infer<typeof usoCotaResumoSchema>;
