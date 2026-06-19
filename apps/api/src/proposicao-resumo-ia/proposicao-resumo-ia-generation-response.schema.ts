import { z } from 'zod';

export const proposicaoResumoIaGenerationResponseSchema = z
  .object({
    status: z.enum(['generated', 'insufficient_source']),
    resumoCard: z.string().max(180).nullable().default(null),
    resumoDetalhe: z.string().max(900).nullable().default(null),
  })
  .superRefine((data, ctx) => {
    if (data.status === 'generated') {
      if (data.resumoCard === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['resumoCard'],
          message: 'resumoCard é obrigatório quando status é generated',
        });
      }
      if (data.resumoDetalhe === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['resumoDetalhe'],
          message: 'resumoDetalhe é obrigatório quando status é generated',
        });
      }
    } else if (data.status === 'insufficient_source') {
      if (data.resumoCard !== null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['resumoCard'],
          message:
            'resumoCard deve ser nulo quando status é insufficient_source',
        });
      }
      if (data.resumoDetalhe !== null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['resumoDetalhe'],
          message:
            'resumoDetalhe deve ser nulo quando status é insufficient_source',
        });
      }
    }
  });

export type ProposicaoResumoIaGenerationResponse = z.infer<
  typeof proposicaoResumoIaGenerationResponseSchema
>;
