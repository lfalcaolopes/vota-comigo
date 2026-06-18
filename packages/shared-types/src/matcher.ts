import { z } from 'zod';

import {
  proposicaoCardSchema,
  votacaoReferenciaResumoSchema,
} from './proposicoes';
import { deputadoVotacaoClassification } from './exercicio';

export const siglaUfEnum = z.enum([
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
]);

export const posicaoUsuarioMatcherEnum = z.enum([
  'aprovar',
  'rejeitar',
  'nao_sei',
]);

export const POSICOES_COMPUTAVEIS = ['aprovar', 'rejeitar'] as const;
export const posicaoComputavelMatcherEnum = z.enum(POSICOES_COMPUTAVEIS);

export const MAX_POSICOES = 30;
export const MIN_POSICOES_COMPUTAVEIS = 3;

export const posicaoMatcherSchema = z.object({
  externalIdProposicao: z.number().int().positive(),
  posicao: posicaoUsuarioMatcherEnum,
});

export const escopoMatcherEnum = z.enum(['estadual', 'nacional']);

export const matcherExecucaoRequestSchema = z.object({
  siglaUf: siglaUfEnum,
  escopo: escopoMatcherEnum.default('estadual'),
  cidade: z.string().trim().min(1).max(120).optional(),
  posicoes: z
    .array(posicaoMatcherSchema)
    .min(MIN_POSICOES_COMPUTAVEIS)
    .max(MAX_POSICOES)
    .superRefine((posicoes, ctx) => {
      const seen = new Set<number>();
      posicoes.forEach((posicao, index) => {
        if (seen.has(posicao.externalIdProposicao)) {
          ctx.addIssue({
            code: 'custom',
            path: [index, 'externalIdProposicao'],
            message: `proposicao duplicada: ${posicao.externalIdProposicao}`,
          });
        }
        seen.add(posicao.externalIdProposicao);
      });
    }),
  apenasEmAtividade: z.boolean().default(false),
});

export const matcherExecucaoResumoSchema = z.object({
  siglaUf: siglaUfEnum,
  cidade: z.string().nullable(),
  totalProposicoesSelecionadas: z.number().int().nonnegative(),
  totalPosicoesComputaveis: z.number().int().nonnegative(),
});

export const alertaMatcherEnum = z.enum(['amostra_pequena']);

export const matcherDeputadoResumoSchema = z.object({
  externalIdDeputado: z.number().int().positive(),
  nome: z.string().nullable(),
  partido: z.string().nullable(),
  siglaUf: siglaUfEnum,
  urlFoto: z.string().nullable(),
  compatibilidadeBruta: z.number().min(0).max(100),
  amostraComparavel: z.number().int().positive(),
  scoreOrdenacaoPercentual: z.number().min(0).max(100),
  alertas: z.array(alertaMatcherEnum),
  emAtividade: z.boolean(),
});

export const matcherResultadoSchema = matcherExecucaoResumoSchema.extend({
  escopo: escopoMatcherEnum,
  deputados: z.array(matcherDeputadoResumoSchema),
  totalDeputadosAvaliados: z.number().int().nonnegative(),
  deputadosHistoricoIncompleto: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
  limit: z.number().int().nonnegative(),
  offset: z.number().int().nonnegative(),
  semBomMatch: z.boolean(),
});

export const matcherEffectEnum = z.enum([
  'concordancia',
  'discordancia',
  'fora_do_denominador',
]);

export const matcherDetalheMetricsSchema = z.object({
  totalConcordancias: z.number().int().nonnegative(),
  totalDiscordancias: z.number().int().nonnegative(),
  totalForaDoDenominador: z.number().int().nonnegative(),
  amostraComparavel: z.number().int().nonnegative(),
  coberturaExercicio: z.number().int().nonnegative(),
  compatibilidadeBruta: z.number().min(0).max(100),
  scoreOrdenacaoPercentual: z.number().min(0).max(100),
  alertas: z.array(alertaMatcherEnum),
});

export const matcherVotoDetalheSchema = z.object({
  proposicao: proposicaoCardSchema,
  posicaoUsuario: posicaoComputavelMatcherEnum,
  votacaoReferencia: votacaoReferenciaResumoSchema,
  situacaoDeputadoVotacao: deputadoVotacaoClassification,
  matcherEffect: matcherEffectEnum,
});

export const matcherDeputadoDetalheSchema = matcherExecucaoResumoSchema.extend({
  deputado: matcherDeputadoResumoSchema.omit({
    compatibilidadeBruta: true,
    amostraComparavel: true,
    scoreOrdenacaoPercentual: true,
    alertas: true,
  }),
  metrics: matcherDetalheMetricsSchema,
  votos: z.array(matcherVotoDetalheSchema),
});

export type SiglaUf = z.infer<typeof siglaUfEnum>;
export type PosicaoUsuarioMatcher = z.infer<typeof posicaoUsuarioMatcherEnum>;
export type PosicaoMatcher = z.infer<typeof posicaoMatcherSchema>;
export type MatcherExecucaoRequest = z.infer<
  typeof matcherExecucaoRequestSchema
>;
export type MatcherExecucaoResumo = z.infer<typeof matcherExecucaoResumoSchema>;
export type EscopoMatcher = z.infer<typeof escopoMatcherEnum>;
export type AlertaMatcher = z.infer<typeof alertaMatcherEnum>;
export type MatcherDeputadoResumo = z.infer<typeof matcherDeputadoResumoSchema>;
export type MatcherResultado = z.infer<typeof matcherResultadoSchema>;
export type MatcherEffect = z.infer<typeof matcherEffectEnum>;
export type MatcherDetalheMetrics = z.infer<typeof matcherDetalheMetricsSchema>;
export type MatcherVotoDetalhe = z.infer<typeof matcherVotoDetalheSchema>;
export type MatcherDeputadoDetalhe = z.infer<
  typeof matcherDeputadoDetalheSchema
>;
