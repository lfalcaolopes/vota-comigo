import { deriveDeputadoOrgaos } from '../rules/deputado-orgaos';

function orgao(overrides: Record<string, unknown> = {}) {
  return {
    idOrgao: 2004,
    uriOrgao: 'https://dadosabertos.camara.leg.br/api/v2/orgaos/2004',
    siglaOrgao: 'CCJC',
    nomeOrgao: 'Comissão de Constituição e Justiça e de Cidadania',
    nomePublicacao: 'Comissão de Constituição e Justiça e de Cidadania',
    titulo: 'Titular',
    codTitulo: 1,
    dataInicio: '2022-03-10',
    dataFim: '2022-12-22',
    ...overrides,
  };
}

describe('vínculos do deputado com órgãos', () => {
  describe('quando o registro da Câmara é válido', () => {
    it('publica somente os campos do contrato do produto', () => {
      // Arrange
      const source = [orgao()];

      // Act
      const result = deriveDeputadoOrgaos(source);

      // Assert
      expect(result).toEqual({
        ok: true,
        items: [
          {
            externalIdOrgao: 2004,
            siglaOrgao: 'CCJC',
            nome: 'Comissão de Constituição e Justiça e de Cidadania',
            titulo: 'Titular',
            dataInicio: '2022-03-10',
            dataFim: '2022-12-22',
          },
        ],
      });
    });

    it('aceita código textual e normaliza datas com horário da fonte', () => {
      // Arrange
      const source = [
        orgao({
          codTitulo: '101',
          dataInicio: '2022-04-27T00:00',
          dataFim: '2023-01-31T23:59',
        }),
      ];

      // Act
      const result = deriveDeputadoOrgaos(source);

      // Assert
      expect(result).toMatchObject({
        ok: true,
        items: [
          expect.objectContaining({
            dataInicio: '2022-04-27',
            dataFim: '2023-01-31',
          }),
        ],
      });
    });
  });

  describe('quando há vários vínculos com o mesmo órgão', () => {
    it('preserva cargos e períodos como registros distintos', () => {
      // Arrange
      const source = [
        orgao({
          titulo: 'Titular',
          dataInicio: '2022-02-01',
          dataFim: '2022-05-31',
        }),
        orgao({
          titulo: 'Presidente',
          dataInicio: '2022-06-01',
          dataFim: '2022-12-22',
        }),
      ];

      // Act
      const result = deriveDeputadoOrgaos(source);

      // Assert
      expect(result).toMatchObject({ ok: true });
      if (result.ok) {
        expect(result.items).toHaveLength(2);
        expect(
          result.items.map(({ titulo, dataInicio }) => ({
            titulo,
            dataInicio,
          })),
        ).toEqual(
          expect.arrayContaining([
            { titulo: 'Titular', dataInicio: '2022-02-01' },
            { titulo: 'Presidente', dataInicio: '2022-06-01' },
          ]),
        );
      }
    });
  });

  describe('quando há títulos com relevâncias diferentes', () => {
    it('ordena direção, titular, suplente e título desconhecido', () => {
      // Arrange
      const source = [
        orgao({ titulo: 'Coordenador', dataInicio: '2022-12-01' }),
        orgao({ titulo: 'Suplente', dataInicio: '2022-11-01' }),
        orgao({ titulo: 'Titular', dataInicio: '2022-10-01' }),
        orgao({ titulo: 'Presidente', dataInicio: '2022-01-01' }),
        orgao({ titulo: '1º Vice-Presidente', dataInicio: '2022-02-01' }),
      ];

      // Act
      const result = deriveDeputadoOrgaos(source);

      // Assert
      expect(result).toMatchObject({ ok: true });
      if (result.ok) {
        expect(result.items.map((item) => item.titulo)).toEqual([
          '1º Vice-Presidente',
          'Presidente',
          'Titular',
          'Suplente',
          'Coordenador',
        ]);
      }
    });
  });

  describe('quando vínculos do mesmo grupo começam na mesma data', () => {
    it('desempata por nome e identificador do órgão', () => {
      // Arrange
      const source = [
        orgao({
          idOrgao: 3,
          nomePublicacao: 'Comissão Zeta',
          titulo: 'Titular',
        }),
        orgao({
          idOrgao: 2,
          nomePublicacao: 'Comissão Alfa',
          titulo: 'Titular',
        }),
        orgao({
          idOrgao: 1,
          nomePublicacao: 'Comissão Alfa',
          titulo: 'Titular',
        }),
      ];

      // Act
      const result = deriveDeputadoOrgaos(source);

      // Assert
      expect(result).toMatchObject({ ok: true });
      if (result.ok) {
        expect(result.items.map((item) => item.externalIdOrgao)).toEqual([
          1, 2, 3,
        ]);
      }
    });
  });

  describe('quando um registro obrigatório é inválido', () => {
    it('rejeita identificador, nome, título ou data inicial ausentes', () => {
      // Arrange
      const invalidSources = [
        orgao({ idOrgao: null }),
        orgao({ nomePublicacao: null, nomeOrgao: null }),
        orgao({ titulo: '' }),
        orgao({ dataInicio: null }),
        orgao({ dataInicio: '2022-02-31' }),
      ];

      // Act
      const results = invalidSources.map((item) =>
        deriveDeputadoOrgaos([item]),
      );

      // Assert
      expect(results).toEqual([
        { ok: false, invalidItemIndex: 0 },
        { ok: false, invalidItemIndex: 0 },
        { ok: false, invalidItemIndex: 0 },
        { ok: false, invalidItemIndex: 0 },
        { ok: false, invalidItemIndex: 0 },
      ]);
    });
  });
});
