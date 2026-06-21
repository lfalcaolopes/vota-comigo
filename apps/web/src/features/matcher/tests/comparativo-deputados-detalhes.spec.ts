import type {
  DeputadoPerfil,
  MatcherDeputadoDetalhe,
  MatcherDeputadoResumo,
  MatcherExecucaoRequest,
} from "@vota-comigo/shared-types";
import { describe, expect, it, vi } from "vitest";

import { loadComparativoDeputadosData } from "../lib/comparativo-deputados-detalhes";

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

function perfil(externalIdDeputado: number): DeputadoPerfil {
  return {
    externalIdDeputado,
    nomePublico: `Deputado ${externalIdDeputado}`,
    nomeCivil: null,
    fonteOficial: `https://www.camara.leg.br/deputados/${externalIdDeputado}`,
    historicoParlamentarDisponivel: true,
    snapshotPublicoDisponivel: true,
    snapshotPublico: {
      nomeEleitoral: `Deputado ${externalIdDeputado}`,
      siglaPartido: "PP",
      siglaUf: "SP",
      urlFoto: null,
    },
    emAtividade: true,
    redesSociais: [],
    dataNascimento: null,
    municipioNascimento: null,
    ufNascimento: null,
    externalIdLegislaturaInicial: null,
    externalIdLegislaturaFinal: null,
    resumoPresencaDisponivel: false,
    resumoPresenca: null,
    historicoPartidarioDisponivel: false,
    historicoPartidario: [],
  };
}

describe("loadComparativoDeputadosData", () => {
  describe("when loading selected deputados", () => {
    it("loads detalhes and perfis once per deputado and preserves selection order", async () => {
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
      const getDeputadoPerfil = vi.fn(async (externalIdDeputado: number) =>
        perfil(externalIdDeputado),
      );

      // Act
      const data = await loadComparativoDeputadosData({
        selectedDeputados: [deputado(20), deputado(10), deputado(30)],
        request,
        getDeputadoDetalhe,
        getDeputadoPerfil,
      });

      // Assert
      expect(getDeputadoDetalhe).toHaveBeenCalledTimes(3);
      expect(getDeputadoDetalhe).toHaveBeenNthCalledWith(1, 20, request);
      expect(getDeputadoDetalhe).toHaveBeenNthCalledWith(2, 10, request);
      expect(getDeputadoDetalhe).toHaveBeenNthCalledWith(3, 30, request);
      expect(getDeputadoPerfil).toHaveBeenCalledTimes(3);
      expect(getDeputadoPerfil).toHaveBeenNthCalledWith(1, 20);
      expect(getDeputadoPerfil).toHaveBeenNthCalledWith(2, 10);
      expect(getDeputadoPerfil).toHaveBeenNthCalledWith(3, 30);
      expect(
        data.detalhes.map((item) => item.deputado.externalIdDeputado),
      ).toEqual([20, 10, 30]);
      expect(data.perfis.map((item) => item.externalIdDeputado)).toEqual([
        20, 10, 30,
      ]);
    });
  });
});
