import {
  filtrarPorAmostraPequena,
  filtrarPorPartido,
  filtrarPorSexo,
} from '../rules/filtro-recorte';

type DeputadoPartido = { externalIdDeputado: number; partido: string | null };
type DeputadoAlertas = {
  externalIdDeputado: number;
  alertas: readonly 'amostra_pequena'[];
};
type DeputadoSiglaSexo = {
  externalIdDeputado: number;
  siglaSexo: string | null;
};

function comPartido(id: number, partido: string | null): DeputadoPartido {
  return { externalIdDeputado: id, partido };
}

function comAlertas(
  id: number,
  alertas: readonly 'amostra_pequena'[] = [],
): DeputadoAlertas {
  return { externalIdDeputado: id, alertas };
}

function comSexo(id: number, siglaSexo: string | null): DeputadoSiglaSexo {
  return { externalIdDeputado: id, siglaSexo };
}

describe('filtrarPorPartido', () => {
  describe('when no partido is selected', () => {
    it('returns the list unchanged', () => {
      // Arrange
      const deputados = [comPartido(1, 'PT'), comPartido(2, null)];

      // Act
      const result = filtrarPorPartido(deputados, []);

      // Assert
      expect(result).toEqual(deputados);
    });
  });

  describe('when partidos are selected', () => {
    it('keeps only the deputados of the selected siglas', () => {
      // Arrange
      const deputados = [
        comPartido(1, 'PT'),
        comPartido(2, 'PL'),
        comPartido(3, 'PSOL'),
      ];

      // Act
      const result = filtrarPorPartido(deputados, ['PT', 'PSOL']);

      // Assert
      expect(result.map((d) => d.externalIdDeputado)).toEqual([1, 3]);
    });

    it('ignores the casing of the requested siglas', () => {
      // Arrange
      const deputados = [comPartido(1, 'PT'), comPartido(2, 'PL')];

      // Act
      const result = filtrarPorPartido(deputados, ['pt']);

      // Assert
      expect(result.map((d) => d.externalIdDeputado)).toEqual([1]);
    });

    it('drops deputados without a partido', () => {
      // Arrange
      const deputados = [comPartido(1, null), comPartido(2, 'PT')];

      // Act
      const result = filtrarPorPartido(deputados, ['PT']);

      // Assert
      expect(result.map((d) => d.externalIdDeputado)).toEqual([2]);
    });

    it('returns an empty list when no deputado belongs to the selection', () => {
      // Act
      const result = filtrarPorPartido([comPartido(1, 'PT')], ['PL']);

      // Assert
      expect(result).toEqual([]);
    });
  });
});

describe('filtrarPorAmostraPequena', () => {
  describe('when the recorte is off', () => {
    it('returns the list unchanged', () => {
      // Arrange
      const deputados = [comAlertas(1, ['amostra_pequena']), comAlertas(2)];

      // Act
      const result = filtrarPorAmostraPequena(deputados, false);

      // Assert
      expect(result).toEqual(deputados);
    });
  });

  describe('when the recorte is on', () => {
    it('drops the deputados flagged with amostra_pequena', () => {
      // Arrange
      const deputados = [
        comAlertas(1, ['amostra_pequena']),
        comAlertas(2),
        comAlertas(3, ['amostra_pequena']),
      ];

      // Act
      const result = filtrarPorAmostraPequena(deputados, true);

      // Assert
      expect(result.map((d) => d.externalIdDeputado)).toEqual([2]);
    });

    it('returns an empty list when every deputado is flagged', () => {
      // Act
      const result = filtrarPorAmostraPequena(
        [comAlertas(1, ['amostra_pequena'])],
        true,
      );

      // Assert
      expect(result).toEqual([]);
    });
  });
});

describe('filtrarPorSexo', () => {
  describe('when no sexo is requested', () => {
    it('returns the list unchanged', () => {
      // Arrange
      const deputados = [comSexo(1, 'F'), comSexo(2, null)];

      // Act
      const result = filtrarPorSexo(deputados, null);

      // Assert
      expect(result).toEqual(deputados);
    });
  });

  describe('when a sexo is requested', () => {
    it('keeps only the deputados of the requested sexo', () => {
      // Arrange
      const deputados = [comSexo(1, 'F'), comSexo(2, 'M'), comSexo(3, 'F')];

      // Act
      const result = filtrarPorSexo(deputados, 'F');

      // Assert
      expect(result.map((d) => d.externalIdDeputado)).toEqual([1, 3]);
    });

    it('ignores the casing of the stored sigla', () => {
      // Arrange
      const deputados = [comSexo(1, 'f'), comSexo(2, 'm')];

      // Act
      const result = filtrarPorSexo(deputados, 'F');

      // Assert
      expect(result.map((d) => d.externalIdDeputado)).toEqual([1]);
    });

    it('drops deputados without a sexo', () => {
      // Arrange
      const deputados = [comSexo(1, null), comSexo(2, 'M')];

      // Act
      const result = filtrarPorSexo(deputados, 'M');

      // Assert
      expect(result.map((d) => d.externalIdDeputado)).toEqual([2]);
    });

    it('returns an empty list when no deputado has the requested sexo', () => {
      // Act
      const result = filtrarPorSexo([comSexo(1, 'M')], 'F');

      // Assert
      expect(result).toEqual([]);
    });
  });
});
