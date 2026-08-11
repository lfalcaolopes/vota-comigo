import { z } from "zod";

const isoDateSchema = z.string().refine(isValidIsoDate);

function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value
  );
}

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
  dataInicio: isoDateSchema,
  dataFim: isoDateSchema.nullable(),
  atual: z.boolean(),
});

export const deputadoLegislaturaPeriodoSchema = z.object({
  dataInicio: z.string(),
  dataFim: z.string(),
});

export const deputadoPerfilValidYearRangeSchema = z.object({
  startYear: z.number().int(),
  endYear: z.number().int(),
});

export const deputadoOrgaoSchema = z.object({
  externalIdOrgao: z.number().int().positive(),
  siglaOrgao: z.string().nullable(),
  nome: z.string().min(1),
  titulo: z.string().min(1),
  dataInicio: z.string(),
  dataFim: z.string().nullable(),
});

export const deputadoOrgaosResponseSchema = z.object({
  year: z.number().int(),
  items: z.array(deputadoOrgaoSchema),
  total: z.number().int().nonnegative(),
});

export const deputadoProposicaoAssinadaSchema = z.object({
  externalIdProposicao: z.number().int().positive(),
  siglaTipo: z.string().min(1).nullable(),
  numero: z.number().int().positive().nullable(),
  ano: z.number().int().positive().nullable(),
  ementa: z.string().min(1).nullable(),
  dataApresentacao: isoDateSchema,
  urlOficial: z.url(),
});

export const deputadoProposicoesAssinadasResponseSchema = z.object({
  year: z.number().int(),
  items: z.array(deputadoProposicaoAssinadaSchema),
  total: z.number().int().nonnegative(),
});

export const deputadoDiscursoLinkKindSchema = z.enum([
  "video",
  "audio",
  "text",
]);

const externalHttpUrlSchema = z.url().refine((value) => {
  try {
    const protocol = new URL(value).protocol;
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
});

export const deputadoDiscursoLinkSchema = z.object({
  kind: deputadoDiscursoLinkKindSchema,
  url: externalHttpUrlSchema,
});

export const deputadoDiscursoSchema = z.object({
  dataHoraInicio: z.string().min(1),
  tipoDiscurso: z.string().min(1),
  fase: z.string().min(1).nullable(),
  sumario: z.string().min(1).nullable(),
  assuntos: z.array(z.string().min(1)),
  links: z.array(deputadoDiscursoLinkSchema),
});

export const deputadoDiscursosResponseSchema = z.object({
  year: z.number().int(),
  items: z.array(deputadoDiscursoSchema),
  total: z.number().int().nonnegative(),
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
    defaultYear: z.number().int().nullable(),
    validYearRange: deputadoPerfilValidYearRangeSchema.nullable(),
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

    if ((perfil.defaultYear === null) !== (perfil.validYearRange === null)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["validYearRange"],
        message: "defaultYear e validYearRange devem estar disponíveis juntos",
      });
    }

    if (
      perfil.defaultYear !== null &&
      perfil.validYearRange !== null &&
      (perfil.defaultYear < perfil.validYearRange.startYear ||
        perfil.defaultYear > perfil.validYearRange.endYear)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["defaultYear"],
        message: "defaultYear deve pertencer a validYearRange",
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
export type DeputadoPerfilValidYearRange = z.infer<
  typeof deputadoPerfilValidYearRangeSchema
>;
export type DeputadoOrgao = z.infer<typeof deputadoOrgaoSchema>;
export type DeputadoOrgaosResponse = z.infer<
  typeof deputadoOrgaosResponseSchema
>;
export type DeputadoProposicaoAssinada = z.infer<
  typeof deputadoProposicaoAssinadaSchema
>;
export type DeputadoProposicoesAssinadasResponse = z.infer<
  typeof deputadoProposicoesAssinadasResponseSchema
>;
export type DeputadoDiscursoLinkKind = z.infer<
  typeof deputadoDiscursoLinkKindSchema
>;
export type DeputadoDiscursoLink = z.infer<typeof deputadoDiscursoLinkSchema>;
export type DeputadoDiscurso = z.infer<typeof deputadoDiscursoSchema>;
export type DeputadoDiscursosResponse = z.infer<
  typeof deputadoDiscursosResponseSchema
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
