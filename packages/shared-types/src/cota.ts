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
