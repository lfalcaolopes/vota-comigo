import { filtrarPorAtividade } from '../rules/filtro-atividade';

type Deputado = { externalIdDeputado: number; emAtividade: boolean };

function dep(id: number, emAtividade: boolean): Deputado {
  return { externalIdDeputado: id, emAtividade };
}

describe('filtrarPorAtividade', () => {
  describe('when apenasEmAtividade is false', () => {
    it('returns the list unchanged', () => {
      // Arrange
      const deputados = [dep(1, true), dep(2, false), dep(3, true)];

      // Act
      const result = filtrarPorAtividade(deputados, false);

      // Assert
      expect(result).toEqual(deputados);
    });

    it('returns an empty list unchanged', () => {
      // Act
      const result = filtrarPorAtividade([], false);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('when apenasEmAtividade is true', () => {
    it('removes inactive deputados', () => {
      // Arrange
      const deputados = [dep(1, true), dep(2, false), dep(3, true)];

      // Act
      const result = filtrarPorAtividade(deputados, true);

      // Assert
      expect(result).toEqual([dep(1, true), dep(3, true)]);
    });

    it('returns an empty list when all are inactive', () => {
      // Arrange
      const deputados = [dep(1, false), dep(2, false)];

      // Act
      const result = filtrarPorAtividade(deputados, true);

      // Assert
      expect(result).toEqual([]);
    });

    it('returns the full list when all are active', () => {
      // Arrange
      const deputados = [dep(1, true), dep(2, true)];

      // Act
      const result = filtrarPorAtividade(deputados, true);

      // Assert
      expect(result).toEqual(deputados);
    });

    it('returns an empty list when the input is empty', () => {
      // Act
      const result = filtrarPorAtividade([], true);

      // Assert
      expect(result).toEqual([]);
    });
  });
});
