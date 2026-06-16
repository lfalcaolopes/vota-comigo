import type {
  MatcherDeputadoDetalhe,
  MatcherDeputadoResumo,
  MatcherExecucaoRequest,
} from "@vota-comigo/shared-types";
import { describe, expect, it, vi } from "vitest";

import { loadComparativoDeputadosDetalhes } from "../lib/comparativo-deputados-detalhes";

function deputado(externalIdDeputado: number): MatcherDeputadoResumo {
  return {
    externalIdDeputado,
    nome: `Deputado ${externalIdDeputado}`,
    partido: "PP",
    siglaUf: "SP",
    urlFoto: null,
    emAtividade: true,
    compatibilidadeBruta: 80,
    amostraComparavel: 3,
    scoreOrdenacaoPercentual: 75,
    alertas: [],
  };
}

function detalhe(externalIdDeputado: number): MatcherDeputadoDetalhe {
  return {
    siglaUf: "SP",
    cidade: null,
    totalProposicoesSelecionadas: 3,
    totalPosicoesComputaveis: 3,
    deputado: {
      externalIdDeputado,
      nome: `Deputado ${externalIdDeputado}`,
      partido: "PP",
      siglaUf: "SP",
      urlFoto: null,
      emAtividade: true,
    },
    metrics: {
      totalConcordancias: 2,
      totalDiscordancias: 1,
      totalForaDoDenominador: 0,
      amostraComparavel: 3,
      coberturaExercicio: 3,
      compatibilidadeBruta: 66.7,
      scoreOrdenacaoPercentual: 70,
      alertas: [],
    },
    votos: [],
  };
}

describe("loadComparativoDeputadosDetalhes", () => {
  describe("when loading selected deputados", () => {
    it("calls the detalhe endpoint once per deputado with the current request and preserves selection order", async () => {
      // Arrange
      const request: MatcherExecucaoRequest = {
        siglaUf: "SP",
        escopo: "estadual",
        cidade: "Santos",
        apenasEmAtividade: true,
        posicoes: [
          { externalIdProposicao: 1, posicao: "aprovar" },
          { externalIdProposicao: 2, posicao: "rejeitar" },
          { externalIdProposicao: 3, posicao: "aprovar" },
        ],
      };
      const getDeputadoDetalhe = vi.fn(async (externalIdDeputado: number) =>
        detalhe(externalIdDeputado),
      );

      // Act
      const detalhes = await loadComparativoDeputadosDetalhes({
        selectedDeputados: [deputado(20), deputado(10), deputado(30)],
        request,
        getDeputadoDetalhe,
      });

      // Assert
      expect(getDeputadoDetalhe).toHaveBeenCalledTimes(3);
      expect(getDeputadoDetalhe).toHaveBeenNthCalledWith(1, 20, request);
      expect(getDeputadoDetalhe).toHaveBeenNthCalledWith(2, 10, request);
      expect(getDeputadoDetalhe).toHaveBeenNthCalledWith(3, 30, request);
      expect(detalhes.map((item) => item.deputado.externalIdDeputado)).toEqual([
        20,
        10,
        30,
      ]);
    });
  });
});
