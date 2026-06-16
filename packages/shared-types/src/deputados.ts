import { z } from 'zod';

export const deputadoSnapshotPublicoSchema = z.object({
  nomeEleitoral: z.string().nullable(),
  siglaPartido: z.string().nullable(),
  siglaUf: z.string().nullable(),
  urlFoto: z.string().nullable(),
});

export const deputadoResumoPresencaSchema = z.object({
  percentualPresenca: z.number().min(0).max(100),
  presencas: z.number().int().nonnegative(),
  totalVotacoesEmExercicio: z.number().int().nonnegative(),
  ausenciasSemMotivoConhecido: z.number().int().nonnegative(),
});

export const deputadoPeriodoPartidarioSchema = z.object({
  siglaPartido: z.string(),
  dataInicio: z.string(),
  dataFim: z.string().nullable(),
  atual: z.boolean(),
});

export const deputadoPerfilSchema = z.object({
  externalIdDeputado: z.number(),
  nomePublico: z.string().nullable(),
  nomeCivil: z.string().nullable(),
  fonteOficial: z.string(),
  historicoParlamentarDisponivel: z.boolean(),
  snapshotPublicoDisponivel: z.boolean(),
  snapshotPublico: deputadoSnapshotPublicoSchema.nullable(),
  emAtividade: z.boolean(),
  redesSociais: z.array(z.string()),
  dataNascimento: z.string().nullable(),
  municipioNascimento: z.string().nullable(),
  ufNascimento: z.string().nullable(),
  externalIdLegislaturaInicial: z.number().nullable(),
  externalIdLegislaturaFinal: z.number().nullable(),
  resumoPresencaDisponivel: z.boolean(),
  resumoPresenca: deputadoResumoPresencaSchema.nullable(),
  historicoPartidarioDisponivel: z.boolean(),
  historicoPartidario: z.array(deputadoPeriodoPartidarioSchema),
});

export type DeputadoSnapshotPublico = z.infer<typeof deputadoSnapshotPublicoSchema>;
export type DeputadoResumoPresenca = z.infer<typeof deputadoResumoPresencaSchema>;
export type DeputadoPeriodoPartidario = z.infer<typeof deputadoPeriodoPartidarioSchema>;
export type DeputadoPerfil = z.infer<typeof deputadoPerfilSchema>;
