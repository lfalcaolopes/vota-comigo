import { z } from "zod";

import {
  cotaComparacaoStatusSchema,
  cotaSemComparacaoMotivoSchema,
} from "./cota";
import {
  deputadoResumoPresencaSchema,
  deputadoSnapshotPublicoSchema,
} from "./deputados";

export const MIN_COMPARATIVO_DEPUTADOS = 2;
export const MAX_COMPARATIVO_DEPUTADOS = 3;

// O ano não é mais o recorte da cota, e sim o detalhamento dela: a comparação
// soma todos os anos da janela e usa estes campos para divulgar o que a soma
// esconde — quem esteve pouco tempo em exercício e onde a fonte trunca.
export const comparativoCotaAnoSchema = z
  .object({
    year: z.number().int().positive(),
    naComparacao: z.boolean(),
    percentualSobreMedianaUf: z.number().nullable(),
    diasEmExercicio: z.number().int().nonnegative(),
    diasNoAno: z.number().int().nonnegative(),
    medianaUfDeputadoCount: z.number().int().positive().nullable(),
    dadoIncompleto: z.boolean(),
  })
  .superRefine((ano, ctx) => {
    if (ano.naComparacao === (ano.percentualSobreMedianaUf === null)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["percentualSobreMedianaUf"],
        message:
          "naComparacao deve coincidir com a presença de percentualSobreMedianaUf",
      });
    }

    if (ano.naComparacao === (ano.medianaUfDeputadoCount === null)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["medianaUfDeputadoCount"],
        message:
          "naComparacao deve coincidir com a presença de medianaUfDeputadoCount",
      });
    }

    if (ano.diasEmExercicio > ano.diasNoAno) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["diasEmExercicio"],
        message: "diasEmExercicio não pode exceder os dias do ano na janela",
      });
    }
  });

export const comparativoCotaSchema = z
  .discriminatedUnion("status", [
    z.object({
      status: z.literal(cotaComparacaoStatusSchema.enum.comparavel),
      // Soma dos gastos sobre a soma das medianas dos anos comparados.
      percentualSobreMedianaUf: z.number(),
      // O total pode ser negativo: cancelamentos de passagem aérea excedem o
      // gasto do período em janelas curtas.
      gastoNaComparacaoCents: z.number().int(),
      // As duas réguas da comparação, ambas somadas sobre os mesmos anos do
      // gasto: a mediana é o denominador do percentual, e o teto é o direito
      // acumulado nos meses de exercício da janela. O teto é nulo quando algum
      // ano em comparação não tem tabela publicada para a UF.
      medianaNaComparacaoCents: z.number().int().positive(),
      tetoNaComparacaoCents: z.number().int().positive().nullable(),
      siglaUf: z.string().length(2),
      anos: z.array(comparativoCotaAnoSchema),
      anosNaComparacao: z.number().int().positive(),
      diasEmExercicio: z.number().int().nonnegative(),
      diasNaComparacao: z.number().int().nonnegative(),
    }),
    z.object({
      status: z.literal(cotaComparacaoStatusSchema.enum["sem-comparacao"]),
      motivo: cotaSemComparacaoMotivoSchema,
      anos: z.array(comparativoCotaAnoSchema),
    }),
  ])
  .superRefine((cota, ctx) => {
    const years = cota.anos.map((ano) => ano.year);
    const ordenados = [...years].sort((a, b) => a - b);
    if (
      new Set(years).size !== years.length ||
      years.some((year, index) => year !== ordenados[index])
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["anos"],
        message: "anos deve listar cada ano uma vez, em ordem crescente",
      });
    }

    const naComparacao = cota.anos.filter((ano) => ano.naComparacao);

    if (cota.status === cotaComparacaoStatusSchema.enum["sem-comparacao"]) {
      if (naComparacao.length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["anos"],
          message: "nenhum ano entra na comparação quando não há comparação",
        });
      }
      return;
    }

    if (naComparacao.length !== cota.anosNaComparacao) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["anosNaComparacao"],
        message: "anosNaComparacao deve contar os anos marcados em anos",
      });
    }

    const somaDiasEmExercicio = naComparacao.reduce(
      (total, ano) => total + ano.diasEmExercicio,
      0,
    );
    if (somaDiasEmExercicio !== cota.diasEmExercicio) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["diasEmExercicio"],
        message: "diasEmExercicio deve somar os anos em comparação",
      });
    }

    const percentualPublicado =
      (cota.gastoNaComparacaoCents / cota.medianaNaComparacaoCents) * 100;
    if (Math.abs(percentualPublicado - cota.percentualSobreMedianaUf) > 0.01) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["percentualSobreMedianaUf"],
        message:
          "percentualSobreMedianaUf deve ser o gasto sobre a mediana publicados",
      });
    }

    const somaDiasNaComparacao = naComparacao.reduce(
      (total, ano) => total + ano.diasNoAno,
      0,
    );
    if (somaDiasNaComparacao !== cota.diasNaComparacao) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["diasNaComparacao"],
        message: "diasNaComparacao deve somar os anos em comparação",
      });
    }
  });

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
      coberturaAte: z.iso.date(),
      divisorAnosEfetivos: z.number().nonnegative(),
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

      // Sem limite inferior: um buraco de cobertura desde o primeiro ano da
      // janela produz coberturaAte anterior ao próprio início da janela —
      // é assim que divisorAnosEfetivos chega a zero sem ficar negativo.
      const anoFimJanela = janela.dataFim.slice(0, 4);
      if (janela.coberturaAte > `${anoFimJanela}-12-31`) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["coberturaAte"],
          message: "coberturaAte não pode passar do fim do ano civil da janela",
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

export const comparativoProposicoesAssinadasIndisponivelMotivoSchema = z.enum([
  "anos-descobertos",
]);

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
    // Disponibilidade é tudo-ou-nada: um ano descoberto no meio da janela
    // produziria um total menor que o real, sem nada na tela que explicasse.
    z.object({
      disponivel: z.literal(false),
      motivo: comparativoProposicoesAssinadasIndisponivelMotivoSchema,
      anosDescobertos: z.array(z.number().int().positive()).min(1),
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
      item.resumoPresenca,
      item.proposicoesAssinadas,
      item.orgaos,
      item.cota,
    ].filter((metrica) => metrica === null).length;
    if (semMetricasDaJanela !== 0 && semMetricasDaJanela !== 4) {
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

export type ComparativoCotaAno = z.infer<typeof comparativoCotaAnoSchema>;
export type ComparativoCota = z.infer<typeof comparativoCotaSchema>;
export type ComparativoJanelaStatus = z.infer<
  typeof comparativoJanelaStatusSchema
>;
export type ComparativoJanelaIndisponivelMotivo = z.infer<
  typeof comparativoJanelaIndisponivelMotivoSchema
>;
export type ComparativoJanela = z.infer<typeof comparativoJanelaSchema>;
export type ComparativoProposicoesAssinadasIndisponivelMotivo = z.infer<
  typeof comparativoProposicoesAssinadasIndisponivelMotivoSchema
>;
export type ComparativoProposicoesAssinadas = z.infer<
  typeof comparativoProposicoesAssinadasSchema
>;
export type ComparativoOrgao = z.infer<typeof comparativoOrgaoSchema>;
export type ComparativoOrgaos = z.infer<typeof comparativoOrgaosSchema>;
export type ComparativoDeputado = z.infer<typeof comparativoDeputadoSchema>;
export type ComparativoDeputadosResponse = z.infer<
  typeof comparativoDeputadosResponseSchema
>;
