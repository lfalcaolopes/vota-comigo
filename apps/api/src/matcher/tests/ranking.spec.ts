import { sortRanking } from '../rules/ranking';
import type { DeputadoResumoComputado } from '../types/compatibilidade.types';

function deputado(
  overrides: Partial<DeputadoResumoComputado> = {},
): DeputadoResumoComputado {
  return {
    externalIdDeputado: 100,
    nome: 'Fulano',
    partido: 'PT',
    siglaUf: 'PE',
    urlFoto: null,
    compatibilidadeBruta: 50,
    amostraComparavel: 10,
    scoreOrdenacaoPercentual: 40,
    alertas: [],
    emAtividade: true,
    coberturaExercicio: 10,
    ...overrides,
  };
}

function ids(deputados: readonly DeputadoResumoComputado[]): number[] {
  return deputados.map((d) => d.externalIdDeputado);
}

describe('sortRanking', () => {
  describe('when scores differ', () => {
    it('ranks the higher scoreOrdenacaoPercentual first', () => {
      // Arrange
      const baixo = deputado({
        externalIdDeputado: 1,
        scoreOrdenacaoPercentual: 30,
      });
      const alto = deputado({
        externalIdDeputado: 2,
        scoreOrdenacaoPercentual: 70,
      });

      // Act
      const ordenados = sortRanking([baixo, alto]);

      // Assert
      expect(ids(ordenados)).toEqual([2, 1]);
    });
  });

  describe('when scores tie', () => {
    it('breaks the tie by compatibilidadeBruta desc', () => {
      // Arrange
      const menor = deputado({
        externalIdDeputado: 1,
        scoreOrdenacaoPercentual: 50,
        compatibilidadeBruta: 60,
      });
      const maior = deputado({
        externalIdDeputado: 2,
        scoreOrdenacaoPercentual: 50,
        compatibilidadeBruta: 80,
      });

      // Act
      const ordenados = sortRanking([menor, maior]);

      // Assert
      expect(ids(ordenados)).toEqual([2, 1]);
    });
  });

  describe('when score and bruta tie', () => {
    it('breaks the tie by coberturaExercicio desc', () => {
      // Arrange
      const menos = deputado({
        externalIdDeputado: 1,
        scoreOrdenacaoPercentual: 50,
        compatibilidadeBruta: 60,
        coberturaExercicio: 5,
      });
      const mais = deputado({
        externalIdDeputado: 2,
        scoreOrdenacaoPercentual: 50,
        compatibilidadeBruta: 60,
        coberturaExercicio: 12,
      });

      // Act
      const ordenados = sortRanking([menos, mais]);

      // Assert
      expect(ids(ordenados)).toEqual([2, 1]);
    });
  });

  describe('when score, bruta and cobertura tie', () => {
    it('ranks an ex-deputado above an active one to prove activity is tiebreak-only', () => {
      // Arrange: ex-deputado has the higher score, so it must still win
      const exDeputadoComScoreMaior = deputado({
        externalIdDeputado: 1,
        scoreOrdenacaoPercentual: 70,
        emAtividade: false,
      });
      const ativoComScoreMenor = deputado({
        externalIdDeputado: 2,
        scoreOrdenacaoPercentual: 50,
        emAtividade: true,
      });

      // Act
      const ordenados = sortRanking([
        ativoComScoreMenor,
        exDeputadoComScoreMaior,
      ]);

      // Assert
      expect(ids(ordenados)).toEqual([1, 2]);
    });

    it('breaks an otherwise exact tie by emAtividade (active first)', () => {
      // Arrange
      const inativo = deputado({ externalIdDeputado: 1, emAtividade: false });
      const ativo = deputado({ externalIdDeputado: 2, emAtividade: true });

      // Act
      const ordenados = sortRanking([inativo, ativo]);

      // Assert
      expect(ids(ordenados)).toEqual([2, 1]);
    });
  });

  describe('when everything up to activity ties', () => {
    it('breaks the tie by nome asc with nulls last', () => {
      // Arrange
      const semNome = deputado({ externalIdDeputado: 1, nome: null });
      const ana = deputado({ externalIdDeputado: 2, nome: 'Ana' });
      const bruno = deputado({ externalIdDeputado: 3, nome: 'Bruno' });

      // Act
      const ordenados = sortRanking([semNome, bruno, ana]);

      // Assert
      expect(ids(ordenados)).toEqual([2, 3, 1]);
    });
  });

  describe('when even the name ties', () => {
    it('breaks the final tie by externalIdDeputado asc', () => {
      // Arrange
      const maiorId = deputado({ externalIdDeputado: 200, nome: 'Ana' });
      const menorId = deputado({ externalIdDeputado: 100, nome: 'Ana' });

      // Act
      const ordenados = sortRanking([maiorId, menorId]);

      // Assert
      expect(ids(ordenados)).toEqual([100, 200]);
    });
  });
});
