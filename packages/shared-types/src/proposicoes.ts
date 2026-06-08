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
  status: proposicaoStatusResumoSchema,
  volumeVotacoesPlenario: z.number(),
  votacaoReferencia: votacaoReferenciaResumoSchema,
});

export const maisVotadasResponseSchema = z.object({
  items: z.array(proposicaoCardSchema),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
});

export const proposicoesSearchResponseSchema = z.object({
  items: z.array(proposicaoCardSchema),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
  query: z.string(),
});

export type VotacaoReferenciaPattern = z.infer<typeof votacaoReferenciaPattern>;
export type Resultado = z.infer<typeof resultadoVotacao>;
export type VotacaoReferenciaResumo = z.infer<
  typeof votacaoReferenciaResumoSchema
>;
export type ProposicaoStatusResumo = z.infer<
  typeof proposicaoStatusResumoSchema
>;
export type ProposicaoCard = z.infer<typeof proposicaoCardSchema>;
export type MaisVotadasResponse = z.infer<typeof maisVotadasResponseSchema>;
export type ProposicoesSearchResponse = z.infer<
  typeof proposicoesSearchResponseSchema
>;
