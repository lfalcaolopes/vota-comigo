import { z } from 'zod';
import {
  proposicaoResumoIaGenerationStatus,
  proposicaoResumoIaReviewStatus,
} from '@vota-comigo/shared-types';

export const proposicaoResumoIaJsonItemSchema = z.object({
  sourceHash: z.string().min(1),
  generationStatus: proposicaoResumoIaGenerationStatus,
  reviewStatus: proposicaoResumoIaReviewStatus,
  resumoCard: z.string().max(180).nullable().default(null),
  resumoDetalhe: z.string().max(900).nullable().default(null),
  model: z.string().nullable().default(null),
  promptVersion: z.string().nullable().default(null),
  generatedAt: z.string().nullable().default(null),
  reviewedAt: z.string().nullable().default(null),
});

export const proposicaoResumoIaJsonSchema = z.object({
  ano: z.number().int().positive(),
  items: z.record(z.string().regex(/^\d+$/), proposicaoResumoIaJsonItemSchema),
});

export type ProposicaoResumoIaJson = z.infer<
  typeof proposicaoResumoIaJsonSchema
>;
