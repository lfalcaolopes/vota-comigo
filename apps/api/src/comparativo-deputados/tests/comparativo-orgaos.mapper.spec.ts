import { toComparativoOrgaos } from '../mappers/comparativo-orgaos.mapper';

describe('mapper de órgãos do comparativo', () => {
  describe('quando há vínculos no período', () => {
    it('ordena por cargo e devolve o total, sem carregar o ano', () => {
      // Arrange
      const source = [
        {
          externalIdOrgao: 2001,
          siglaOrgao: 'CCJC',
          nome: 'Comissão de Constituição e Justiça e de Cidadania',
          titulo: 'Suplente',
          dataInicio: '2024-01-01',
          dataFim: null,
        },
        {
          externalIdOrgao: 2002,
          siglaOrgao: 'CFT',
          nome: 'Comissão de Finanças e Tributação',
          titulo: 'Presidente',
          dataInicio: '2024-02-01',
          dataFim: null,
        },
      ];

      // Act
      const result = toComparativoOrgaos(source);

      // Assert
      expect(result.total).toBe(2);
      expect(result.items.map((item) => item.siglaOrgao)).toEqual([
        'CFT',
        'CCJC',
      ]);
    });
  });

  describe('quando um registro não tem nome ou título', () => {
    it('descarta o registro incompleto', () => {
      // Arrange
      const source = [
        {
          externalIdOrgao: 2001,
          siglaOrgao: 'CCJC',
          nome: null,
          titulo: 'Titular',
          dataInicio: '2024-01-01',
          dataFim: null,
        },
      ];

      // Act
      const result = toComparativoOrgaos(source);

      // Assert
      expect(result).toEqual({ items: [], total: 0 });
    });
  });

  describe('quando não há vínculos', () => {
    it('devolve total zero', () => {
      // Act
      const result = toComparativoOrgaos([]);

      // Assert
      expect(result).toEqual({ items: [], total: 0 });
    });
  });
});
