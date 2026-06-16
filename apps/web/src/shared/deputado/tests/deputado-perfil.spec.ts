import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { DeputadoPerfil as DeputadoPerfilData } from "@vota-comigo/shared-types";
import { describe, expect, it } from "vitest";

import { DeputadoPerfil } from "../deputado-perfil";

function makePerfil(
  overrides: Partial<DeputadoPerfilData> = {},
): DeputadoPerfilData {
  return {
    externalIdDeputado: 220593,
    nomePublico: "Maria da Silva",
    nomeCivil: "Maria Aparecida da Silva",
    fonteOficial: "https://www.camara.leg.br/deputados/220593",
    historicoParlamentarDisponivel: true,
    snapshotPublicoDisponivel: true,
    snapshotPublico: {
      nomeEleitoral: "Maria da Silva",
      siglaPartido: "PT",
      siglaUf: "SP",
      urlFoto: "https://example.com/foto.jpg",
    },
    emAtividade: true,
    redesSociais: ["https://twitter.com/maria"],
    dataNascimento: "1980-05-10",
    municipioNascimento: "São Paulo",
    ufNascimento: "SP",
    externalIdLegislaturaInicial: 55,
    externalIdLegislaturaFinal: 57,
    resumoPresencaDisponivel: true,
    resumoPresenca: {
      percentualPresenca: 80,
      presencas: 80,
      totalVotacoesEmExercicio: 100,
      ausenciasSemMotivoConhecido: 20,
    },
    ...overrides,
  };
}

function render(perfil: DeputadoPerfilData): string {
  return renderToStaticMarkup(createElement(DeputadoPerfil, { perfil }));
}

describe("DeputadoPerfil", () => {
  describe("dados cadastrais basicos", () => {
    it("shows the public name, the cargo and the official source link", () => {
      // Arrange
      const perfil = makePerfil();

      // Act
      const html = render(perfil);

      // Assert
      expect(html).toContain("Maria da Silva");
      expect(html).toContain("Deputado federal");
      expect(html).toContain("Ver fonte oficial na Câmara");
      expect(html).toContain("https://www.camara.leg.br/deputados/220593");
    });

    it("shows the nome civil as secondary metadata when it differs from the public name", () => {
      // Arrange
      const perfil = makePerfil();

      // Act
      const html = render(perfil);

      // Assert
      expect(html).toContain("Maria Aparecida da Silva");
    });

    it("omits the nome civil when it matches the public name", () => {
      // Arrange
      const perfil = makePerfil({
        nomePublico: "Maria da Silva",
        nomeCivil: "Maria da Silva",
      });

      // Act
      const html = render(perfil);

      // Assert
      expect(html.match(/Maria da Silva/g)).toHaveLength(1);
    });
  });

  describe("snapshot e atividade", () => {
    it("shows partido and UF from the snapshot", () => {
      // Arrange
      const perfil = makePerfil();

      // Act
      const html = render(perfil);

      // Assert
      expect(html).toContain("PT");
      expect(html).toContain("SP");
    });

    it("shows em atividade badge when deputado is active", () => {
      // Arrange
      const perfil = makePerfil({ emAtividade: true });

      // Act
      const html = render(perfil);

      // Assert
      expect(html).toContain("Em atividade");
    });

    it("shows mandato encerrado badge when deputado is inactive", () => {
      // Arrange
      const perfil = makePerfil({ emAtividade: false });

      // Act
      const html = render(perfil);

      // Assert
      expect(html).toContain("Mandato encerrado");
    });

    it("shows the avatar image when urlFoto is available", () => {
      // Arrange
      const perfil = makePerfil();

      // Act
      const html = render(perfil);

      // Assert
      expect(html).toContain("<img");
      expect(html).toContain("example.com");
    });

    it("shows initials fallback when urlFoto is null", () => {
      // Arrange
      const perfil = makePerfil({
        snapshotPublico: {
          nomeEleitoral: "Maria da Silva",
          siglaPartido: "PT",
          siglaUf: "SP",
          urlFoto: null,
        },
      });

      // Act
      const html = render(perfil);

      // Assert
      expect(html).toContain("MS");
      expect(html).not.toContain("<img");
    });

    it("shows dash when siglaPartido is null", () => {
      // Arrange
      const perfil = makePerfil({
        snapshotPublico: {
          nomeEleitoral: "Maria da Silva",
          siglaPartido: null,
          siglaUf: "SP",
          urlFoto: null,
        },
      });

      // Act
      const html = render(perfil);

      // Assert
      expect(html).toContain("—");
    });
  });

  describe("redes sociais", () => {
    it("renders links for each rede social", () => {
      // Arrange
      const perfil = makePerfil({
        redesSociais: [
          "https://twitter.com/maria",
          "https://instagram.com/maria",
        ],
      });

      // Act
      const html = render(perfil);

      // Assert
      expect(html).toContain("https://twitter.com/maria");
      expect(html).toContain("https://instagram.com/maria");
    });

    it("omits the redes sociais section when the list is empty", () => {
      // Arrange
      const perfil = makePerfil({ redesSociais: [] });

      // Act
      const html = render(perfil);

      // Assert
      expect(html).not.toContain("Redes sociais");
    });
  });

  describe("metadados publicos", () => {
    it("shows birth metadata when available", () => {
      // Arrange
      const perfil = makePerfil();

      // Act
      const html = render(perfil);

      // Assert
      expect(html).toContain("São Paulo");
      expect(html).toContain("1980-05-10");
    });

    it("omits birth metadata when not available", () => {
      // Arrange
      const perfil = makePerfil({
        dataNascimento: null,
        municipioNascimento: null,
        ufNascimento: null,
      });

      // Act
      const html = render(perfil);

      // Assert
      expect(html).not.toContain("Nascimento");
    });

    it("shows legislatura metadata when available", () => {
      // Arrange
      const perfil = makePerfil();

      // Act
      const html = render(perfil);

      // Assert
      expect(html).toContain("55");
      expect(html).toContain("57");
    });

    it("omits legislatura metadata when not available", () => {
      // Arrange
      const perfil = makePerfil({
        externalIdLegislaturaInicial: null,
        externalIdLegislaturaFinal: null,
      });

      // Act
      const html = render(perfil);

      // Assert
      expect(html).not.toContain("Legislatura inicial");
    });
  });

  describe("lacuna de historico parlamentar", () => {
    it("shows a gap message for history-dependent data when the deputado has no history", () => {
      // Arrange
      const perfil = makePerfil({ historicoParlamentarDisponivel: false });

      // Act
      const html = render(perfil);

      // Assert
      expect(html).toContain("histórico parlamentar");
    });

    it("does not show the gap message when the deputado has history", () => {
      // Arrange
      const perfil = makePerfil({ historicoParlamentarDisponivel: true });

      // Act
      const html = render(perfil);

      // Assert
      expect(html).not.toContain("Sem histórico parlamentar");
    });
  });

  describe("resumo de presenca", () => {
    describe("when resumoPresencaDisponivel is true", () => {
      it("shows the percentual, sample label, ausencias and recorte text", () => {
        // Arrange
        const perfil = makePerfil({
          resumoPresencaDisponivel: true,
          resumoPresenca: {
            percentualPresenca: 75,
            presencas: 75,
            totalVotacoesEmExercicio: 100,
            ausenciasSemMotivoConhecido: 25,
          },
        });

        // Act
        const html = render(perfil);

        // Assert
        expect(html).toContain("75%");
        expect(html).toContain("75 de 100 votações em exercício");
        expect(html).toContain("25");
        expect(html).toContain("sem motivo conhecido");
        expect(html).toContain("votações nominais de plenário");
      });

      it("shows the correct percentage without the unavailable message", () => {
        // Arrange
        const perfil = makePerfil({
          resumoPresencaDisponivel: true,
          resumoPresenca: {
            percentualPresenca: 100,
            presencas: 10,
            totalVotacoesEmExercicio: 10,
            ausenciasSemMotivoConhecido: 0,
          },
        });

        // Act
        const html = render(perfil);

        // Assert
        expect(html).toContain("100%");
        expect(html).not.toContain("Presença indisponível");
      });

      it("omits the ausencias line when ausenciasSemMotivoConhecido is zero", () => {
        // Arrange
        const perfil = makePerfil({
          resumoPresencaDisponivel: true,
          resumoPresenca: {
            percentualPresenca: 100,
            presencas: 5,
            totalVotacoesEmExercicio: 5,
            ausenciasSemMotivoConhecido: 0,
          },
        });

        // Act
        const html = render(perfil);

        // Assert
        expect(html).not.toContain("sem motivo conhecido");
      });
    });

    describe("when resumoPresencaDisponivel is false", () => {
      it("shows the unavailable message without displaying 0%", () => {
        // Arrange
        const perfil = makePerfil({
          resumoPresencaDisponivel: false,
          resumoPresenca: null,
        });

        // Act
        const html = render(perfil);

        // Assert
        expect(html).toContain("Presença indisponível");
        expect(html).not.toContain("0%");
      });

      it("does not show votacoes em exercicio sample label", () => {
        // Arrange
        const perfil = makePerfil({
          resumoPresencaDisponivel: false,
          resumoPresenca: null,
        });

        // Act
        const html = render(perfil);

        // Assert
        expect(html).not.toContain("votações em exercício");
      });
    });
  });
});
