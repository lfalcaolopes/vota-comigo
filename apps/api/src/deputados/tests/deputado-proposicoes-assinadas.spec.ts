import {
  buildProposicoesAssinadasQuarters,
  deriveDeputadoProposicoesAssinadas,
} from '../rules/deputado-proposicoes-assinadas';

describe('proposições assinadas pelo deputado', () => {
  describe('quando a Câmara devolve uma proposição dentro do ano', () => {
    it('publica os campos do contrato e a página oficial derivada do identificador', () => {
      // Arrange
      const source = [
        {
          id: 2318532,
          uri: 'https://dadosabertos.camara.leg.br/api/v2/proposicoes/2318532',
          siglaTipo: 'REQ',
          codTipo: 359,
          numero: 388,
          ano: 2022,
          ementa: 'Requer a criação da Comissão Especial.',
          dataApresentacao: '2022-03-23T16:06',
        },
      ];

      // Act
      const result = deriveDeputadoProposicoesAssinadas(source, 2022);

      // Assert
      expect(result).toEqual({
        ok: true,
        items: [
          {
            externalIdProposicao: 2318532,
            siglaTipo: 'REQ',
            numero: 388,
            ano: 2022,
            ementa: 'Requer a criação da Comissão Especial.',
            dataApresentacao: '2022-03-23',
            urlOficial:
              'https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=2318532',
          },
        ],
      });
    });
  });

  describe('quando a Câmara devolve uma proposição fora do ano solicitado', () => {
    it('rejeita a resposta em vez de incluir o item silenciosamente', () => {
      // Arrange
      const source = [
        proposicao({ id: 1, dataApresentacao: '2022-12-31T23:59' }),
        proposicao({ id: 2, dataApresentacao: '2023-01-01T00:01' }),
      ];

      // Act
      const result = deriveDeputadoProposicoesAssinadas(source, 2022);

      // Assert
      expect(result).toEqual({ ok: false, invalidItemIndex: 1 });
    });
  });

  describe('quando a mesma proposição chega por mais de um trimestre', () => {
    it('publica um único item para cada identificador', () => {
      // Arrange
      const source = [
        proposicao({ id: 2318532, dataApresentacao: '2022-03-23T16:06' }),
        proposicao({ id: 2327419, dataApresentacao: '2022-05-04T10:00' }),
        proposicao({ id: 2318532, dataApresentacao: '2022-03-23T16:06' }),
      ];

      // Act
      const result = deriveDeputadoProposicoesAssinadas(source, 2022);

      // Assert
      expect(result).toMatchObject({ ok: true });
      const items = (result as { items: { externalIdProposicao: number }[] })
        .items;
      expect(
        [...items.map((item) => item.externalIdProposicao)].sort(),
      ).toEqual([2318532, 2327419]);
    });
  });

  describe('quando várias proposições foram apresentadas no ano', () => {
    it('ordena da mais recente para a mais antiga, desempatando pelo identificador', () => {
      // Arrange
      const source = [
        proposicao({ id: 2314276, dataApresentacao: '2022-02-09T13:55' }),
        proposicao({ id: 2332640, dataApresentacao: '2022-08-16T09:30' }),
        proposicao({ id: 2314280, dataApresentacao: '2022-02-09T13:55' }),
        proposicao({ id: 2318532, dataApresentacao: '2022-03-23T16:06' }),
      ];

      // Act
      const result = deriveDeputadoProposicoesAssinadas(source, 2022);

      // Assert
      expect(result).toMatchObject({
        ok: true,
        items: [
          { externalIdProposicao: 2332640 },
          { externalIdProposicao: 2318532 },
          { externalIdProposicao: 2314280 },
          { externalIdProposicao: 2314276 },
        ],
      });
    });
  });

  describe('quando a proposição tem ano legislativo zero', () => {
    it('mantém a proposição no recorte e não publica o ano ausente', () => {
      // Arrange
      const source = [
        proposicao({
          id: 2314871,
          siglaTipo: 'RDF',
          numero: 1,
          ano: 0,
          dataApresentacao: '2022-02-09T23:59',
        }),
      ];

      // Act
      const result = deriveDeputadoProposicoesAssinadas(source, 2022);

      // Assert
      expect(result).toMatchObject({
        ok: true,
        items: [
          {
            externalIdProposicao: 2314871,
            siglaTipo: 'RDF',
            numero: 1,
            ano: null,
            dataApresentacao: '2022-02-09',
          },
        ],
      });
    });
  });

  describe('quando o ano inteiro não tem proposições assinadas', () => {
    it('publica uma lista vazia em vez de falhar', () => {
      // Arrange
      const source: readonly unknown[] = [];

      // Act
      const result = deriveDeputadoProposicoesAssinadas(source, 2022);

      // Assert
      expect(result).toEqual({ ok: true, items: [] });
    });
  });

  describe('quando o ano é dividido para caber no limite de três meses da fonte', () => {
    it('cobre o ano inteiro em quatro intervalos contíguos e sem sobreposição', () => {
      // Arrange
      const year = 2022;

      // Act
      const quarters = buildProposicoesAssinadasQuarters(year);

      // Assert
      expect(quarters).toEqual([
        { start: '2022-01-01', end: '2022-03-31' },
        { start: '2022-04-01', end: '2022-06-30' },
        { start: '2022-07-01', end: '2022-09-30' },
        { start: '2022-10-01', end: '2022-12-31' },
      ]);
    });

    it('mantém os mesmos limites em ano bissexto', () => {
      // Arrange
      const year = 2024;

      // Act
      const quarters = buildProposicoesAssinadasQuarters(year);

      // Assert
      expect(quarters).toEqual([
        { start: '2024-01-01', end: '2024-03-31' },
        { start: '2024-04-01', end: '2024-06-30' },
        { start: '2024-07-01', end: '2024-09-30' },
        { start: '2024-10-01', end: '2024-12-31' },
      ]);
    });
  });
});

function proposicao(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id: 2318532,
    siglaTipo: 'REQ',
    numero: 388,
    ano: 2022,
    ementa: 'Requer a criação da Comissão Especial.',
    dataApresentacao: '2022-03-23T16:06',
    ...overrides,
  };
}
