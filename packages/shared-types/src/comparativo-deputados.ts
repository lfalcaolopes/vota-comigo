import { z } from "zod";

import {
  deputadoResumoPresencaSchema,
  deputadoSnapshotPublicoSchema,
} from "./deputados";

export const MIN_COMPARATIVO_DEPUTADOS = 2;
export const MAX_COMPARATIVO_DEPUTADOS = 3;

export const comparativoCotaStatusSchema = z.enum([
  "comparavel",
  "sem-comparacao",
  "ano-nao-carregado",
]);

export const comparativoCotaSemComparacaoMotivoSchema = z.enum([
  "exercicio-parcial",
  "dado-incompleto",
  "sem-gastos",
]);

// A mediana chega sem o valor absoluto: com ele, o percentual de cada deputado
// devolveria o gasto nominal de todos os comparados da mesma UF.
export const comparativoCotaMedianaUfSchema = z.object({
  siglaUf: z.string().length(2),
  deputadoCount: z.number().int().positive(),
});

export const comparativoCotaSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal(comparativoCotaStatusSchema.enum.comparavel),
    percentualSobreMedianaUf: z.number(),
    medianaUf: comparativoCotaMedianaUfSchema,
  }),
  z.object({
    status: z.literal(comparativoCotaStatusSchema.enum["sem-comparacao"]),
    motivo: comparativoCotaSemComparacaoMotivoSchema,
  }),
  z.object({
    status: z.literal(comparativoCotaStatusSchema.enum["ano-nao-carregado"]),
  }),
]);

export const comparativoJanelaStatusSchema = z.enum([
  "disponivel",
  "indisponivel",
]);

export const comparativoJanelaIndisponivelMotivoSchema = z.enum([
  "legislatura-anterior-a-cobertura",
  "sem-legislatura-registrada",
]);

export const comparativoJanelaSchema = z
  .discriminatedUnion("status", [
    z.object({
      status: z.literal(comparativoJanelaStatusSchema.enum.disponivel),
      legislatura: z.number().int().positive(),
      dataInicio: z.string(),
      dataFim: z.string(),
      encerrada: z.boolean(),
      diasEmExercicioDisponivel: z.boolean(),
      diasEmExercicio: z.number().int().nonnegative().nullable(),
    }),
    z.object({
      status: z.literal(comparativoJanelaStatusSchema.enum.indisponivel),
      motivo: comparativoJanelaIndisponivelMotivoSchema,
      ultimaLegislatura: z.number().int().positive().nullable(),
    }),
  ])
  .superRefine((janela, ctx) => {
    if (janela.status === comparativoJanelaStatusSchema.enum.disponivel) {
      if (
        janela.diasEmExercicioDisponivel ===
        (janela.diasEmExercicio === null)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["diasEmExercicio"],
          message:
            "diasEmExercicioDisponivel deve coincidir com a presença de diasEmExercicio",
        });
      }

      if (janela.dataFim < janela.dataInicio) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["dataFim"],
          message: "dataFim não pode ser anterior a dataInicio",
        });
      }
      return;
    }

    const semLegislaturaRegistrada =
      janela.motivo ===
      comparativoJanelaIndisponivelMotivoSchema.enum[
        "sem-legislatura-registrada"
      ];
    if (semLegislaturaRegistrada !== (janela.ultimaLegislatura === null)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ultimaLegislatura"],
        message:
          "ultimaLegislatura só falta quando o motivo é sem-legislatura-registrada",
      });
    }
  });

// Forma própria do comparativo: sem `year`, porque a janela do comparativo
// não é mais um ano civil. O perfil mantém sua própria forma anual.
export const comparativoProposicoesAssinadasSchema = z
  .discriminatedUnion("disponivel", [
    z.object({
      disponivel: z.literal(true),
      total: z.number().int().nonnegative(),
      totalPrimeiroSignatario: z.number().int().nonnegative(),
      coveredThroughDate: z.iso.date().nullable(),
    }),
    z.object({
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
  });

export const comparativoOrgaoSchema = z.object({
  externalIdOrgao: z.number().int().positive(),
  siglaOrgao: z.string().nullable(),
  nome: z.string().min(1),
  titulo: z.string().min(1),
  dataInicio: z.string(),
  dataFim: z.string().nullable(),
});

export const comparativoOrgaosSchema = z.object({
  items: z.array(comparativoOrgaoSchema),
  total: z.number().int().nonnegative(),
});

export const comparativoDeputadoSchema = z
  .object({
    externalIdDeputado: z.number().int().positive(),
    nomePublico: z.string().nullable(),
    nomeCivil: z.string().nullable(),
    fonteOficial: z.string(),
    emAtividade: z.boolean(),
    snapshotPublicoDisponivel: z.boolean(),
    snapshotPublico: deputadoSnapshotPublicoSchema.nullable(),
    janela: comparativoJanelaSchema,
    resumoPresencaDisponivel: z.boolean(),
    resumoPresenca: deputadoResumoPresencaSchema.nullable(),
    proposicoesAssinadas: comparativoProposicoesAssinadasSchema.nullable(),
    orgaos: comparativoOrgaosSchema.nullable(),
    cota: comparativoCotaSchema.nullable(),
  })
  .superRefine((item, ctx) => {
    if (item.snapshotPublicoDisponivel === (item.snapshotPublico === null)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["snapshotPublico"],
        message:
          "snapshotPublicoDisponivel deve coincidir com a presença de snapshotPublico",
      });
    }

    if (item.resumoPresencaDisponivel === (item.resumoPresenca === null)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["resumoPresenca"],
        message:
          "resumoPresencaDisponivel deve coincidir com a presença de resumoPresenca",
      });
    }

    const semMetricasDaJanela = [
      item.proposicoesAssinadas,
      item.orgaos,
      item.cota,
    ].filter((metrica) => metrica === null).length;
    if (semMetricasDaJanela !== 0 && semMetricasDaJanela !== 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cota"],
        message: "as métricas da janela devem estar disponíveis juntas",
      });
    }

    const janela = item.janela;
    const janelaDisponivel = janela.status === "disponivel";
    if ((semMetricasDaJanela === 0) !== janelaDisponivel) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["janela"],
        message: "as métricas só ficam disponíveis quando a janela está",
      });
    }

    if (janela.status !== "disponivel") {
      return;
    }

    if (
      item.proposicoesAssinadas !== null &&
      item.proposicoesAssinadas.disponivel &&
      item.proposicoesAssinadas.coveredThroughDate !== null &&
      item.proposicoesAssinadas.coveredThroughDate <
        janela.dataInicio.slice(0, 10)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["proposicoesAssinadas", "coveredThroughDate"],
        message: "coveredThroughDate não pode ser anterior ao início da janela",
      });
    }

    if (item.orgaos !== null) {
      const janelaInicio = janela.dataInicio.slice(0, 10);
      const janelaFim = janela.dataFim.slice(0, 10);
      item.orgaos.items.forEach((orgao, orgaoIndex) => {
        const orgaoFim = orgao.dataFim ?? janelaFim;
        if (orgao.dataInicio > janelaFim || orgaoFim < janelaInicio) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["orgaos", "items", orgaoIndex],
            message: "órgão fora do período da janela",
          });
        }
      });
    }
  });

export const comparativoDeputadosResponseSchema = z
  .object({
    janelasCoincidem: z.boolean(),
    items: z
      .array(comparativoDeputadoSchema)
      .min(MIN_COMPARATIVO_DEPUTADOS)
      .max(MAX_COMPARATIVO_DEPUTADOS),
  })
  .superRefine((response, ctx) => {
    const externalIdsDeputado = response.items.map(
      (item) => item.externalIdDeputado,
    );
    if (new Set(externalIdsDeputado).size !== externalIdsDeputado.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["items"],
        message: "items não pode repetir o mesmo deputado",
      });
    }

    const legislaturasDisponiveis = new Set(
      response.items
        .map((item) => item.janela)
        .filter((janela) => janela.status === "disponivel")
        .map((janela) => janela.legislatura),
    );
    const deveriamCoincidir = legislaturasDisponiveis.size <= 1;
    if (response.janelasCoincidem !== deveriamCoincidir) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["janelasCoincidem"],
        message:
          "janelasCoincidem deve refletir se as legislaturas dos itens disponíveis coincidem",
      });
    }
  });

export type ComparativoCotaStatus = z.infer<typeof comparativoCotaStatusSchema>;
export type ComparativoCotaSemComparacaoMotivo = z.infer<
  typeof comparativoCotaSemComparacaoMotivoSchema
>;
export type ComparativoCotaMedianaUf = z.infer<
  typeof comparativoCotaMedianaUfSchema
>;
export type ComparativoCota = z.infer<typeof comparativoCotaSchema>;
export type ComparativoJanelaStatus = z.infer<
  typeof comparativoJanelaStatusSchema
>;
export type ComparativoJanelaIndisponivelMotivo = z.infer<
  typeof comparativoJanelaIndisponivelMotivoSchema
>;
export type ComparativoJanela = z.infer<typeof comparativoJanelaSchema>;
export type ComparativoProposicoesAssinadas = z.infer<
  typeof comparativoProposicoesAssinadasSchema
>;
export type ComparativoOrgao = z.infer<typeof comparativoOrgaoSchema>;
export type ComparativoOrgaos = z.infer<typeof comparativoOrgaosSchema>;
export type ComparativoDeputado = z.infer<typeof comparativoDeputadoSchema>;
export type ComparativoDeputadosResponse = z.infer<
  typeof comparativoDeputadosResponseSchema
>;
