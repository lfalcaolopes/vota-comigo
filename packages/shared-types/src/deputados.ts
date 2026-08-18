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

export const deputadoCeapStatusSchema = z.enum([
  "ok",
  "sem-gastos",
  "ano-nao-carregado",
]);

export const deputadoCeapSigepaDataStatusSchema = z.enum([
  "nao-aplicavel",
  "completo",
  "incompleto",
]);

const amountUsedCentsSchema = z.number().int().safe();

export const deputadoCeapCategorySchema = z.object({
  externalNumSubCota: z.number().int().nonnegative(),
  description: z.string().min(1),
  amountUsedCents: amountUsedCentsSchema,
});

export const deputadoCeapMonthCategorySchema = z.object({
  externalNumSubCota: z.number().int().nonnegative(),
  amountUsedCents: amountUsedCentsSchema,
});

export const deputadoCeapMonthSchema = z.object({
  month: z.number().int().min(1).max(12),
  totalAmountUsedCents: amountUsedCentsSchema.nullable(),
  categories: z.array(deputadoCeapMonthCategorySchema),
});

export const deputadoCeapMedianaUfSchema = z.object({
  amountUsedCents: amountUsedCentsSchema,
  deputadoCount: z.number().int().positive(),
});

export const deputadoCeapTetoUfSchema = z.object({
  amountCents: z.number().int().positive(),
  monthCount: z.number().int().min(1).max(12),
});

const deputadoCeapResponseBaseShape = {
  year: z.number().int(),
  availableYears: z.array(z.number().int()),
};

const deputadoCeapLoadedResponseSchema = z.object({
  ...deputadoCeapResponseBaseShape,
  status: deputadoCeapStatusSchema.extract([
    deputadoCeapStatusSchema.enum.ok,
    deputadoCeapStatusSchema.enum["sem-gastos"],
  ]),
  sigepaDataStatus: deputadoCeapSigepaDataStatusSchema,
  coveredThroughMonth: z.number().int().min(1).max(12),
  totalAmountUsedCents: amountUsedCentsSchema,
  siglaUf: z.string().length(2).nullable(),
  exercicioAnoCompleto: z.boolean(),
  diasEmExercicio: z.number().int().nonnegative(),
  diasNaJanela: z.number().int().positive(),
  medianaUf: deputadoCeapMedianaUfSchema.nullable(),
  tetoUf: deputadoCeapTetoUfSchema.nullable(),
  categories: z.array(deputadoCeapCategorySchema),
  months: z.array(deputadoCeapMonthSchema).length(12),
});

export const deputadoCeapResponseSchema = z
  .discriminatedUnion("status", [
    deputadoCeapLoadedResponseSchema,
    z.object({
      ...deputadoCeapResponseBaseShape,
      status: z.literal(deputadoCeapStatusSchema.enum["ano-nao-carregado"]),
    }),
  ])
  .superRefine((response, ctx) => {
    if (
      response.status !== deputadoCeapStatusSchema.enum["ano-nao-carregado"] &&
      response.months.some((item, index) => item.month !== index + 1)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["months"],
        message: "months deve conter os meses 1 a 12 em ordem",
      });
    }

    if (
      response.status !== deputadoCeapStatusSchema.enum["ano-nao-carregado"] &&
      response.months.some((item) =>
        item.month <= response.coveredThroughMonth
          ? item.totalAmountUsedCents === null
          : item.totalAmountUsedCents !== null || item.categories.length > 0,
      )
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["months"],
        message: "months deve distinguir cobertura de ausência de dados",
      });
    }

    if (
      response.status !== deputadoCeapStatusSchema.enum["ano-nao-carregado"] &&
      response.medianaUf !== null &&
      response.status !== deputadoCeapStatusSchema.enum.ok
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["medianaUf"],
        message: "medianaUf só pode acompanhar um ano com gastos",
      });
    }

    if (
      response.status !== deputadoCeapStatusSchema.enum["ano-nao-carregado"] &&
      response.diasEmExercicio > response.diasNaJanela
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["diasEmExercicio"],
        message: "diasEmExercicio não pode exceder a janela do ano",
      });
    }

    if (
      response.status !== deputadoCeapStatusSchema.enum["ano-nao-carregado"] &&
      response.sigepaDataStatus ===
        deputadoCeapSigepaDataStatusSchema.enum.incompleto &&
      response.medianaUf !== null
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["medianaUf"],
        message: "medianaUf não acompanha um ano de fonte incompleta",
      });
    }

    if (
      response.status === deputadoCeapStatusSchema.enum.ok &&
      response.exercicioAnoCompleto &&
      response.sigepaDataStatus !==
        deputadoCeapSigepaDataStatusSchema.enum.incompleto &&
      response.medianaUf === null
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["medianaUf"],
        message: "medianaUf é obrigatória no exercício anual completo",
      });
    }

    if (
      response.status !== deputadoCeapStatusSchema.enum["ano-nao-carregado"] &&
      response.tetoUf !== null &&
      response.siglaUf === null
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["tetoUf"],
        message: "tetoUf depende da UF de eleição do deputado",
      });
    }

    if (
      response.status === deputadoCeapStatusSchema.enum["sem-gastos"] &&
      (response.totalAmountUsedCents !== 0 ||
        response.siglaUf !== null ||
        response.medianaUf !== null ||
        response.tetoUf !== null ||
        response.categories.length > 0 ||
        response.months.some(
          (item) =>
            item.categories.length > 0 ||
            (item.month <= response.coveredThroughMonth &&
              item.totalAmountUsedCents !== 0),
        ))
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["status"],
        message: "sem-gastos não pode carregar valores ou categorias",
      });
    }
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

export const deputadoProposicoesAssinadasResponseSchema = z
  .discriminatedUnion("disponivel", [
    z.object({
      year: z.number().int(),
      disponivel: z.literal(true),
      total: z.number().int().nonnegative(),
      totalPrimeiroSignatario: z.number().int().nonnegative(),
      coveredThroughDate: z.iso.date().nullable(),
    }),
    z.object({
      year: z.number().int(),
      disponivel: z.literal(false),
    }),
  ])
  .superRefine((response, ctx) => {
    if (!response.disponivel) {
      return;
    }

    if (response.totalPrimeiroSignatario > response.total) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["totalPrimeiroSignatario"],
        message:
          "totalPrimeiroSignatario não pode exceder o total de assinaturas",
      });
    }

    // Um ano disponível tem assinaturas datadas nele, então a fronteira da
    // fonte é sempre igual ou posterior a esse ano.
    if (
      response.coveredThroughDate !== null &&
      Number(response.coveredThroughDate.slice(0, 4)) < response.year
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["coveredThroughDate"],
        message: "coveredThroughDate não pode ser anterior ao ano disponível",
      });
    }
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

export const deputadoSexoSchema = z.enum(["F", "M"]);

// Décadas fechadas nas pontas abertas: nenhuma faixa deixa deputado de fora
// por idade, só por data de nascimento ausente.
export const deputadoFaixaEtariaSchema = z.enum([
  "ate-39",
  "40-49",
  "50-59",
  "60-69",
  "70-mais",
]);

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
export type DeputadoCeapStatus = z.infer<typeof deputadoCeapStatusSchema>;
export type DeputadoCeapSigepaDataStatus = z.infer<
  typeof deputadoCeapSigepaDataStatusSchema
>;
export type DeputadoCeapCategory = z.infer<typeof deputadoCeapCategorySchema>;
export type DeputadoCeapMonthCategory = z.infer<
  typeof deputadoCeapMonthCategorySchema
>;
export type DeputadoCeapMonth = z.infer<typeof deputadoCeapMonthSchema>;
export type DeputadoCeapMedianaUf = z.infer<typeof deputadoCeapMedianaUfSchema>;
export type DeputadoCeapTetoUf = z.infer<typeof deputadoCeapTetoUfSchema>;
export type DeputadoCeapResponse = z.infer<typeof deputadoCeapResponseSchema>;
export type DeputadoCeapLoadedResponse = z.infer<
  typeof deputadoCeapLoadedResponseSchema
>;
export type DeputadoOrgao = z.infer<typeof deputadoOrgaoSchema>;
export type DeputadoOrgaosResponse = z.infer<
  typeof deputadoOrgaosResponseSchema
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
export type DeputadoSexo = z.infer<typeof deputadoSexoSchema>;
export type DeputadoFaixaEtaria = z.infer<typeof deputadoFaixaEtariaSchema>;
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
