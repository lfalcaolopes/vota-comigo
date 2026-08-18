import { describe, expect, it } from "vitest";

import { FILTROS_PADRAO } from "../feed-filtros";
import {
  buildDeputadosFeedHref,
  buildDeputadosFeedSearchParams,
  parseDeputadosFeedUrlState,
  type DeputadosFeedSearchParams,
} from "../feed-url";

describe("parseDeputadosFeedUrlState", () => {
  describe("when deputado feed params are present", () => {
    it("parses query, exercicio recorte, UF, and partido", () => {
      // Arrange / Act
      const state = parseDeputadosFeedUrlState({
        q: " maria ",
        incluirForaDeExercicio: "true",
        uf: "sp",
        partido: " PTdoB ",
      });

      // Assert
      expect(state).toEqual({
        ...FILTROS_PADRAO,
        query: "maria",
        incluirForaDeExercicio: true,
        ufs: ["SP"],
        partidos: ["PTdoB"],
      });
    });

    it("parses sexo and faixa etaria", () => {
      // Arrange / Act
      const state = parseDeputadosFeedUrlState({
        sexo: "f",
        faixaEtaria: "40-49",
      });

      // Assert
      expect(state.sexo).toBe("F");
      expect(state.faixasEtarias).toEqual(["40-49"]);
    });
  });

  describe("when a param is repeated", () => {
    it("parses every value into the selection", () => {
      // Arrange / Act
      const state = parseDeputadosFeedUrlState({
        uf: ["sp", "RJ"],
        partido: ["PT", "PL"],
        faixaEtaria: ["40-49", "70-mais"],
      });

      // Assert
      expect(state.ufs).toEqual(["SP", "RJ"]);
      expect(state.partidos).toEqual(["PT", "PL"]);
      expect(state.faixasEtarias).toEqual(["40-49", "70-mais"]);
    });

    it("collapses a value repeated in the address", () => {
      // Arrange / Act
      const state = parseDeputadosFeedUrlState({ uf: ["SP", "sp"] });

      // Assert
      expect(state.ufs).toEqual(["SP"]);
    });
  });

  describe("when deputado feed params are invalid", () => {
    it("drops invalid params", () => {
      // Arrange / Act
      const state = parseDeputadosFeedUrlState({
        q: " /// ",
        incluirForaDeExercicio: "sim",
        uf: "SPP",
        partido: "PT-SP",
        sexo: "X",
        faixaEtaria: "30-39",
      });

      // Assert
      expect(state).toEqual({ ...FILTROS_PADRAO, query: null });
    });

    // Endereços compartilhados antes do recorte padrão traziam emAtividade=true;
    // o param sumiu e o padrão devolve exatamente a mesma lista.
    it("ignores the legacy emAtividade param", () => {
      // Arrange / Act
      const state = parseDeputadosFeedUrlState({
        emAtividade: "true",
      } as DeputadosFeedSearchParams);

      // Assert
      expect(state).toEqual({ ...FILTROS_PADRAO, query: null });
      expect(state.incluirForaDeExercicio).toBe(false);
    });

    // Um endereço editado à mão não pode derrubar a página inteira por causa
    // de um valor errado no meio da lista.
    it("keeps the valid values of a repeated param", () => {
      // Arrange / Act
      const state = parseDeputadosFeedUrlState({ uf: ["SP", "BRASIL"] });

      // Assert
      expect(state.ufs).toEqual(["SP"]);
    });
  });
});

describe("buildDeputadosFeedSearchParams", () => {
  it("keeps active deputado feed criteria in the query string", () => {
    // Arrange / Act
    const params = buildDeputadosFeedSearchParams({
      ...FILTROS_PADRAO,
      query: "maria silva",
      incluirForaDeExercicio: true,
      ufs: ["SP"],
      partidos: ["PT"],
    });

    // Assert
    expect(params.toString()).toBe(
      "q=maria+silva&incluirForaDeExercicio=true&uf=SP&partido=PT",
    );
  });

  it("repeats the key once per selected value", () => {
    // Arrange / Act
    const params = buildDeputadosFeedSearchParams({
      ...FILTROS_PADRAO,
      query: null,
      ufs: ["SP", "RJ"],
      faixasEtarias: ["40-49", "70-mais"],
    });

    // Assert
    expect(params.toString()).toBe(
      "uf=SP&uf=RJ&faixaEtaria=40-49&faixaEtaria=70-mais",
    );
  });

  it("omits filters left at their default", () => {
    // Arrange / Act
    const params = buildDeputadosFeedSearchParams({
      ...FILTROS_PADRAO,
      query: null,
    });

    // Assert
    expect(params.toString()).toBe("");
  });

  it("keeps sexo in the query string", () => {
    // Arrange / Act
    const params = buildDeputadosFeedSearchParams({
      ...FILTROS_PADRAO,
      query: null,
      sexo: "F",
    });

    // Assert
    expect(params.toString()).toBe("sexo=F");
  });
});

describe("buildDeputadosFeedHref", () => {
  it("appends deputado feed params to a pathname", () => {
    // Arrange / Act
    const href = buildDeputadosFeedHref("/deputados", {
      ...FILTROS_PADRAO,
      query: "maria",
      incluirForaDeExercicio: true,
      ufs: ["SP"],
      partidos: ["PT"],
    });

    // Assert
    expect(href).toBe(
      "/deputados?q=maria&incluirForaDeExercicio=true&uf=SP&partido=PT",
    );
  });

  it("returns the bare pathname when nothing is active", () => {
    // Arrange / Act
    const href = buildDeputadosFeedHref("/deputados", {
      ...FILTROS_PADRAO,
      query: null,
    });

    // Assert
    expect(href).toBe("/deputados");
  });
});
