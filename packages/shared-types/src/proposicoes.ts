import { z } from 'zod';

export const votacaoReferenciaPattern = z.enum([
  'pec_segundo_turno',
  'medida_provisoria',
  'projeto_de_lei',
  'projeto_decreto_legislativo',
  'projeto_resolucao',
  'substitutivo_ou_subemenda_substitutiva',
  'pec_generica',
  'emendas_senado_federal',
  'pec_primeiro_turno',
  'recall_turno_cascata',
  'redacao_final',
]);

export const resultadoVotacao = z.enum([
  'aprovada',
  'rejeitada',
  'indisponivel',
]);

export const feedOrdenacao = z.enum(['mais-votadas', 'mais-recentes']);

export const proposicaoResumoIaGenerationStatus = z.enum([
  'generated',
  'insufficient_source',
  'error',
]);

export const proposicaoResumoIaReviewStatus = z.enum([
  'pending',
  'approved',
  'rejected',
  'stale',
]);

export const votacaoReferenciaResumoSchema = z.object({
  externalIdVotacao: z.string(),
  data: z.string().nullable(),
  descricao: z.string().nullable(),
  pattern: votacaoReferenciaPattern,
  votosSim: z.number(),
  votosNao: z.number(),
  votosOutros: z.number(),
  resultado: resultadoVotacao,
});

export const proposicaoStatusResumoSchema = z.object({
  siglaOrgao: z.string().nullable(),
  situacao: z.string().nullable(),
  regime: z.string().nullable(),
  dataHora: z.string().nullable(),
});

export const proposicaoCardSchema = z.object({
  externalIdProposicao: z.number(),
  siglaTipo: z.string().nullable(),
  numero: z.number().nullable(),
  ano: z.number().nullable(),
  ementa: z.string().nullable(),
  resumoIaDisponivel: z.boolean(),
  resumoIaCard: z.string().nullable(),
  dataApresentacao: z.string().nullable(),
  volumeVotacoesPlenario: z.number(),
  dataUltimaVotacao: z.string().nullable(),
});

export const placarVotacaoSchema = z.discriminatedUnion('placarCompleto', [
  z.object({
    placarCompleto: z.literal(true),
    votosSim: z.number(),
    votosNao: z.number(),
    votosAbstencao: z.number(),
    votosObstrucao: z.number(),
    votosArtigo17: z.number(),
    votosNaoInformado: z.number(),
  }),
  z.object({
    placarCompleto: z.literal(false),
    votosSim: z.number(),
    votosNao: z.number(),
    votosOutros: z.number(),
  }),
]);

export const votacaoNominalSchema = z.object({
  externalIdVotacao: z.string(),
  data: z.string().nullable(),
  descricao: z.string().nullable(),
  placar: placarVotacaoSchema,
  resultado: resultadoVotacao,
  isReferenciaMatcher: z.boolean(),
});

export const temaOficialSchema = z.object({
  externalCodTema: z.number(),
  tema: z.string().nullable(),
});

export const proposicaoDetalheSchema = z.object({
  externalIdProposicao: z.number(),
  siglaTipo: z.string().nullable(),
  numero: z.number().nullable(),
  ano: z.number().nullable(),
  ementa: z.string().nullable(),
  dataApresentacao: z.string().nullable(),
  ementaDetalhada: z.string().nullable(),
  urlInteiroTeor: z.string().nullable(),
  resumoIaDisponivel: z.boolean(),
  resumoIaCard: z.string().nullable(),
  resumoIaDetalhe: z.string().nullable(),
  status: proposicaoStatusResumoSchema,
  fonteOficial: z.string(),
  temas: z.array(temaOficialSchema),
  votacoes: z.array(votacaoNominalSchema),
});

export const temaDisponivelSchema = z.object({
  externalCodTema: z.number(),
  tema: z.string(),
});

export const temasDisponiveisResponseSchema = z.object({
  items: z.array(temaDisponivelSchema),
});

export const proposicoesFeedResponseSchema = z.object({
  items: z.array(proposicaoCardSchema),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
});

export type VotacaoReferenciaPattern = z.infer<typeof votacaoReferenciaPattern>;
export type Resultado = z.infer<typeof resultadoVotacao>;
export type FeedOrdenacao = z.infer<typeof feedOrdenacao>;
export type ProposicaoResumoIaGenerationStatus = z.infer<
  typeof proposicaoResumoIaGenerationStatus
>;
export type ProposicaoResumoIaReviewStatus = z.infer<
  typeof proposicaoResumoIaReviewStatus
>;
export type VotacaoReferenciaResumo = z.infer<
  typeof votacaoReferenciaResumoSchema
>;
export type ProposicaoStatusResumo = z.infer<
  typeof proposicaoStatusResumoSchema
>;
export type ProposicaoCard = z.infer<typeof proposicaoCardSchema>;
export type PlacarVotacao = z.infer<typeof placarVotacaoSchema>;
export type VotacaoNominal = z.infer<typeof votacaoNominalSchema>;
export type TemaOficial = z.infer<typeof temaOficialSchema>;
export type ProposicaoDetalhe = z.infer<typeof proposicaoDetalheSchema>;
export type TemaDisponivel = z.infer<typeof temaDisponivelSchema>;
export type TemasDisponiveisResponse = z.infer<typeof temasDisponiveisResponseSchema>;
export type ProposicoesFeedResponse = z.infer<typeof proposicoesFeedResponseSchema>;
