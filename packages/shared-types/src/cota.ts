import { z } from "zod";

// O vocabulário da comparação de cota com a mediana da UF nasceu no comparativo
// de deputados, mas o feed passou a filtrar e ordenar por ele. Como o conjunto
// atravessa mais de uma fronteira, mora aqui e é declarado uma vez só.
export const cotaComparacaoStatusSchema = z.enum([
  "comparavel",
  "sem-comparacao",
]);

export const cotaSemComparacaoMotivoSchema = z.enum([
  "sem-mediana-na-janela",
  "sem-gastos",
]);

export type CotaComparacaoStatus = z.infer<typeof cotaComparacaoStatusSchema>;
export type CotaSemComparacaoMotivo = z.infer<
  typeof cotaSemComparacaoMotivoSchema
>;

const amountUsedCentsSchema = z.number().int().safe();

export const cotaLegislaturaCategorySchema = z.object({
  externalNumSubCota: z.number().int().nonnegative(),
  description: z.string().min(1),
  amountUsedCents: amountUsedCentsSchema,
});

export const cotaLegislaturaResponseSchema = z.object({
  legislatura: z.number().int().positive(),
  periodStart: z.iso.date(),
  coberturaAte: z.iso.date(),
  deputadoCount: z.number().int().nonnegative(),
  totalAmountUsedCents: amountUsedCentsSchema,
  categories: z.array(cotaLegislaturaCategorySchema),
});

export type CotaLegislaturaCategory = z.infer<
  typeof cotaLegislaturaCategorySchema
>;
export type CotaLegislaturaResponse = z.infer<
  typeof cotaLegislaturaResponseSchema
>;
