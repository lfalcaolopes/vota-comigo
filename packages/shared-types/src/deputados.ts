import { z } from "zod";

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

export const deputadoLegislaturaPeriodoSchema = z.object({
  dataInicio: z.string(),
  dataFim: z.string(),
});

export const deputadoPerfilSchema = z
  .object({
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
    legislaturaInicialPeriodo: deputadoLegislaturaPeriodoSchema.nullable(),
    legislaturaFinalPeriodo: deputadoLegislaturaPeriodoSchema.nullable(),
    resumoPresencaDisponivel: z.boolean(),
    resumoPresenca: deputadoResumoPresencaSchema.nullable(),
    historicoPartidarioDisponivel: z.boolean(),
    historicoPartidario: z.array(deputadoPeriodoPartidarioSchema),
  })
  .superRefine((perfil, ctx) => {
    if (
      perfil.snapshotPublicoDisponivel ===
      (perfil.snapshotPublico === null)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["snapshotPublico"],
        message:
          "snapshotPublicoDisponivel deve coincidir com a presença de snapshotPublico",
      });
    }

    if (perfil.resumoPresencaDisponivel === (perfil.resumoPresenca === null)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["resumoPresenca"],
        message:
          "resumoPresencaDisponivel deve coincidir com a presença de resumoPresenca",
      });
    }

    if (
      perfil.historicoPartidarioDisponivel ===
      (perfil.historicoPartidario.length === 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["historicoPartidario"],
        message:
          "historicoPartidarioDisponivel deve coincidir com a presença de períodos partidários",
      });
    }

    if (
      !perfil.historicoParlamentarDisponivel &&
      (perfil.snapshotPublicoDisponivel ||
        perfil.resumoPresencaDisponivel ||
        perfil.historicoPartidarioDisponivel)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["historicoParlamentarDisponivel"],
        message:
          "sem histórico parlamentar, snapshot, presença e histórico partidário devem estar indisponíveis",
      });
    }
  });

export const deputadoCardSchema = z.object({
  externalIdDeputado: z.number(),
  nomePublico: z.string().nullable(),
  nomeCivil: z.string().nullable(),
  siglaPartido: z.string().nullable(),
  siglaUf: z.string().nullable(),
  urlFoto: z.string().nullable(),
  emAtividade: z.boolean(),
});

export const deputadoFeedResponseSchema = z.object({
  items: z.array(deputadoCardSchema),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
});

export const ufDisponivelSchema = z.object({
  siglaUf: z.string(),
});

export const ufsDisponiveisResponseSchema = z.object({
  items: z.array(ufDisponivelSchema),
});

export const partidoDisponivelSchema = z.object({
  siglaPartido: z.string(),
});

export const partidosDisponiveisResponseSchema = z.object({
  items: z.array(partidoDisponivelSchema),
});

export type DeputadoSnapshotPublico = z.infer<
  typeof deputadoSnapshotPublicoSchema
>;
export type DeputadoResumoPresenca = z.infer<
  typeof deputadoResumoPresencaSchema
>;
export type DeputadoPeriodoPartidario = z.infer<
  typeof deputadoPeriodoPartidarioSchema
>;
export type DeputadoLegislaturaPeriodo = z.infer<
  typeof deputadoLegislaturaPeriodoSchema
>;
export type DeputadoPerfil = z.infer<typeof deputadoPerfilSchema>;
export type DeputadoCard = z.infer<typeof deputadoCardSchema>;
export type DeputadosFeedResponse = z.infer<typeof deputadoFeedResponseSchema>;
export type UfDisponivel = z.infer<typeof ufDisponivelSchema>;
export type UfsDisponiveisResponse = z.infer<
  typeof ufsDisponiveisResponseSchema
>;
export type PartidoDisponivel = z.infer<typeof partidoDisponivelSchema>;
export type PartidosDisponiveisResponse = z.infer<
  typeof partidosDisponiveisResponseSchema
>;
