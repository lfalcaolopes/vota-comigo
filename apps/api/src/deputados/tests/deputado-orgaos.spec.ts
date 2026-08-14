import type { DeputadoOrgao } from '@vota-comigo/shared-types';

import { sortDeputadoOrgaos } from '../rules/deputado-orgaos';

function orgao(overrides: Partial<DeputadoOrgao> = {}): DeputadoOrgao {
  return {
    externalIdOrgao: 2004,
    siglaOrgao: 'CCJC',
    nome: 'Comissão de Constituição e Justiça e de Cidadania',
    titulo: 'Titular',
    dataInicio: '2022-03-10',
    dataFim: '2022-12-22',
    ...overrides,
  };
}

describe('ordenação dos vínculos do deputado com órgãos', () => {
  describe('quando há vários vínculos com o mesmo órgão', () => {
    it('preserva cargos e períodos como registros distintos', () => {
      // Arrange
      const items = [
        orgao({ titulo: 'Titular', dataInicio: '2022-02-01' }),
        orgao({ titulo: 'Presidente', dataInicio: '2022-06-01' }),
      ];

      // Act
      const result = sortDeputadoOrgaos(items);

      // Assert
      expect(result).toHaveLength(2);
      expect(
        result.map(({ titulo, dataInicio }) => ({ titulo, dataInicio })),
      ).toEqual(
        expect.arrayContaining([
          { titulo: 'Titular', dataInicio: '2022-02-01' },
          { titulo: 'Presidente', dataInicio: '2022-06-01' },
        ]),
      );
    });
  });

  describe('quando há títulos com relevâncias diferentes', () => {
    it('ordena direção, titular, suplente e título desconhecido', () => {
      // Arrange
      const items = [
        orgao({ titulo: 'Coordenador', dataInicio: '2022-12-01' }),
        orgao({ titulo: 'Suplente', dataInicio: '2022-11-01' }),
        orgao({ titulo: 'Titular', dataInicio: '2022-10-01' }),
        orgao({ titulo: 'Presidente', dataInicio: '2022-01-01' }),
        orgao({ titulo: '1º Vice-Presidente', dataInicio: '2022-02-01' }),
      ];

      // Act
      const result = sortDeputadoOrgaos(items);

      // Assert
      expect(result.map((item) => item.titulo)).toEqual([
        '1º Vice-Presidente',
        'Presidente',
        'Titular',
        'Suplente',
        'Coordenador',
      ]);
    });
  });

  describe('quando vínculos do mesmo grupo começam na mesma data', () => {
    it('desempata por nome e identificador do órgão', () => {
      // Arrange
      const items = [
        orgao({ externalIdOrgao: 3, nome: 'Comissão Zeta', titulo: 'Titular' }),
        orgao({ externalIdOrgao: 2, nome: 'Comissão Alfa', titulo: 'Titular' }),
        orgao({ externalIdOrgao: 1, nome: 'Comissão Alfa', titulo: 'Titular' }),
      ];

      // Act
      const result = sortDeputadoOrgaos(items);

      // Assert
      expect(result.map((item) => item.externalIdOrgao)).toEqual([1, 2, 3]);
    });
  });

  describe('quando vínculos do mesmo grupo começam em datas diferentes', () => {
    it('ordena do vínculo mais recente para o mais antigo', () => {
      // Arrange
      const items = [
        orgao({ externalIdOrgao: 1, dataInicio: '2022-01-01' }),
        orgao({ externalIdOrgao: 2, dataInicio: '2022-06-01' }),
      ];

      // Act
      const result = sortDeputadoOrgaos(items);

      // Assert
      expect(result.map((item) => item.externalIdOrgao)).toEqual([2, 1]);
    });
  });

  describe('quando a entrada já está ordenada', () => {
    it('não muta o array recebido', () => {
      // Arrange
      const items = [
        orgao({ externalIdOrgao: 1 }),
        orgao({ externalIdOrgao: 2 }),
      ];
      const original = [...items];

      // Act
      sortDeputadoOrgaos(items);

      // Assert
      expect(items).toEqual(original);
    });
  });
});
