import type { DeputadosRepository } from '../deputados.repository';
import { DeputadosService } from '../deputados.service';
import type { DeputadoPerfilSource } from '../types/deputados.types';
import type { CamaraPaginatedClient } from '../../shared/camara/camara-paginated-client';

afterEach(() => {
  jest.useRealTimers();
});

function perfilSource(): DeputadoPerfilSource {
  return {
    id: 'deputado-id',
    externalIdDeputado: 220593,
    nome: 'Maria Nome Cadastro',
    nomeCivil: 'Maria Aparecida da Silva',
    dataNascimento: null,
    municipioNascimento: null,
    ufNascimento: null,
    urlRedeSocial: null,
    externalIdLegislaturaInicial: 56,
    externalIdLegislaturaFinal: 57,
    legislaturaInicialPeriodo: {
      dataInicio: '2019-02-01',
      dataFim: '2023-01-31',
    },
    legislaturaFinalPeriodo: {
      dataInicio: '2023-02-01',
      dataFim: '2027-01-31',
    },
    eventos: [],
  };
}

function fakeRepository(
  overrides: Partial<DeputadosRepository> = {},
): DeputadosRepository {
  return {
    loadDeputadosFeed: async () => ({ items: [], total: 0 }),
    loadUfsDisponiveis: async () => [],
    loadPartidosDisponiveis: async () => [],
    loadDeputadoPerfil: async () => null,
    loadResumoPresenca: async () => null,
    loadResumoPresencaDaLegislatura: async () => null,
    loadDeputadoCeapSource: async () => ({
      coberturas: [],
      gasto: null,
      gastosSigepaJson: null,
      categorias: [],
      medianaUf: null,
      intervalosExercicio: [],
      datasInicioLegislatura: [],
    }),
    loadDeputadoOrgaos: async () => [],
    loadDeputadoProposicoesAssinadasSource: async () => ({
      anoCoberto: false,
      assinaturasJson: null,
      coveredThroughDate: null,
    }),
    loadCoberturaCotaMensal: async () => [],
    loadCotaComparacao: async () => null,
    loadDeputadoOrgaosNaJanela: async () => [],
    loadDeputadoProposicoesAssinadasJanela: async () => ({
      anos: [],
      coveredThroughDate: null,
    }),
    loadLegislaturas: async () => [],
    loadIntervalosExercicio: async () => [],
    ...overrides,
  };
}

function createService(repository: DeputadosRepository): DeputadosService {
  const client: CamaraPaginatedClient = { fetchAll: jest.fn() };
  return new DeputadosService(repository, client);
}

describe('DeputadosService gastos da cota', () => {
  describe('quando o deputado não existe', () => {
    it('responde que o deputado não foi encontrado', async () => {
      // Arrange
      const service = createService(fakeRepository());

      // Act
      const result = service.ceap(999999, 2024);

      // Assert
      await expect(result).rejects.toMatchObject({ status: 404 });
    });
  });

  describe('quando o ano está fora da faixa do deputado', () => {
    it('responde erro de entrada', async () => {
      // Arrange
      const service = createService(
        fakeRepository({ loadDeputadoPerfil: async () => perfilSource() }),
      );

      // Act
      const result = service.ceap(220593, 2018);

      // Assert
      await expect(result).rejects.toMatchObject({ status: 400 });
    });
  });

  describe('quando o ano não é informado', () => {
    it('consulta o ano default do perfil', async () => {
      // Arrange
      jest.useFakeTimers().setSystemTime(new Date('2026-08-13T12:00:00Z'));
      const loadDeputadoCeapSource = jest.fn().mockResolvedValue({
        coberturas: [],
        gasto: null,
        gastosSigepaJson: null,
        categorias: [],
        medianaUf: null,
        intervalosExercicio: [],
        datasInicioLegislatura: [],
      });
      const service = createService(
        fakeRepository({
          loadDeputadoPerfil: async () => perfilSource(),
          loadDeputadoCeapSource,
        }),
      );

      // Act
      const result = await service.ceap(220593);

      // Assert
      expect(loadDeputadoCeapSource).toHaveBeenCalledWith('deputado-id', 2026);
      expect(result).toEqual({
        year: 2026,
        availableYears: [],
        status: 'ano-nao-carregado',
      });
    });
  });

  describe('quando o ano foi carregado sem gastos do deputado', () => {
    it('responde zero nos meses cobertos e lacuna nos demais', async () => {
      // Arrange
      const service = createService(
        fakeRepository({
          loadDeputadoPerfil: async () => perfilSource(),
          loadDeputadoCeapSource: async () => ({
            coberturas: [
              {
                year: 2024,
                coveredThroughMonth: 8,
                sigepaReposto: false,
                sigepaCoveredThroughMonth: null,
              },
            ],
            gasto: null,
            gastosSigepaJson: null,
            categorias: [],
            medianaUf: null,
            intervalosExercicio: [
              { openedAt: '2023-02-02T00:00:00.000Z', closedAt: null },
            ],
            datasInicioLegislatura: [],
          }),
        }),
      );

      // Act
      const result = await service.ceap(220593, 2024);

      // Assert
      expect(result).toEqual({
        year: 2024,
        availableYears: [2024],
        status: 'sem-gastos',
        sigepaDataStatus: 'completo',
        coveredThroughMonth: 8,
        totalAmountUsedCents: 0,
        siglaUf: null,
        exercicioAnoCompleto: true,
        diasEmExercicio: 366,
        diasNaJanela: 366,
        medianaUf: null,
        tetoUf: null,
        categories: [],
        months: Array.from({ length: 12 }, (_, index) => ({
          month: index + 1,
          totalAmountUsedCents: index < 8 ? 0 : null,
          categories: [],
        })),
      });
    });
  });

  describe('quando o ano foi carregado com gastos do deputado', () => {
    it('responde todos os agregados oficiais em centavos', async () => {
      // Arrange
      const service = createService(
        fakeRepository({
          loadDeputadoPerfil: async () => perfilSource(),
          loadDeputadoCeapSource: async () => ({
            coberturas: [
              {
                year: 2024,
                coveredThroughMonth: 3,
                sigepaReposto: false,
                sigepaCoveredThroughMonth: null,
              },
            ],
            gasto: {
              siglaUf: 'MG',
              gastosJson: {
                '1': { '1': 10050, '2': -50 },
                '3': { '1': 200 },
                '12': { '1': 999999 },
              },
            },
            gastosSigepaJson: null,
            categorias: [
              { externalNumSubCota: 1, description: 'Combustíveis' },
              { externalNumSubCota: 2, description: 'Passagens' },
            ],
            medianaUf: { amountUsedCents: 9500, deputadoCount: 53 },
            intervalosExercicio: [
              { openedAt: '2023-02-02T00:00:00.000Z', closedAt: null },
            ],
            datasInicioLegislatura: [],
          }),
        }),
      );

      // Act
      const result = await service.ceap(220593, 2024);

      // Assert
      expect(result).toMatchObject({
        status: 'ok',
        sigepaDataStatus: 'completo',
        coveredThroughMonth: 3,
        totalAmountUsedCents: 10200,
        siglaUf: 'MG',
        exercicioAnoCompleto: true,
        medianaUf: { amountUsedCents: 9500, deputadoCount: 53 },
        categories: [
          {
            externalNumSubCota: 1,
            description: 'Combustíveis',
            amountUsedCents: 10250,
          },
          {
            externalNumSubCota: 2,
            description: 'Passagens',
            amountUsedCents: -50,
          },
        ],
      });
      expect('months' in result ? result.months : []).toEqual([
        {
          month: 1,
          totalAmountUsedCents: 10000,
          categories: [
            { externalNumSubCota: 1, amountUsedCents: 10050 },
            { externalNumSubCota: 2, amountUsedCents: -50 },
          ],
        },
        { month: 2, totalAmountUsedCents: 0, categories: [] },
        {
          month: 3,
          totalAmountUsedCents: 200,
          categories: [{ externalNumSubCota: 1, amountUsedCents: 200 }],
        },
        ...Array.from({ length: 9 }, (_, index) => ({
          month: index + 4,
          totalAmountUsedCents: null,
          categories: [],
        })),
      ]);
    });
  });

  describe('quando o teto da cota entra na comparação', () => {
    const ceapSource = (
      intervalosExercicio: readonly {
        openedAt: string;
        closedAt: string | null;
      }[],
    ) => ({
      coberturas: [
        {
          year: 2024,
          coveredThroughMonth: 3,
          sigepaReposto: false,
          sigepaCoveredThroughMonth: null,
        },
      ],
      gasto: { siglaUf: 'MG', gastosJson: { '1': { '1': 10000 } } },
      gastosSigepaJson: null,
      categorias: [{ externalNumSubCota: 1, description: 'Combustíveis' }],
      medianaUf: { amountUsedCents: 9500, deputadoCount: 53 },
      intervalosExercicio,
      datasInicioLegislatura: [],
    });

    it('soma os doze tetos mensais da UF no exercício anual completo', async () => {
      // Arrange
      const service = createService(
        fakeRepository({
          loadDeputadoPerfil: async () => perfilSource(),
          loadDeputadoCeapSource: async () =>
            ceapSource([
              { openedAt: '2023-02-02T00:00:00.000Z', closedAt: null },
            ]),
        }),
      );

      // Act
      const result = await service.ceap(220593, 2024);

      // Assert
      expect(result).toMatchObject({
        siglaUf: 'MG',
        tetoUf: { amountCents: 4188651 * 12, monthCount: 12 },
      });
    });

    it('proporciona o teto aos meses exercidos', async () => {
      // Arrange
      const service = createService(
        fakeRepository({
          loadDeputadoPerfil: async () => perfilSource(),
          loadDeputadoCeapSource: async () =>
            ceapSource([
              {
                openedAt: '2024-03-20T00:00:00.000Z',
                closedAt: '2024-07-05T00:00:00.000Z',
              },
            ]),
        }),
      );

      // Act
      const result = await service.ceap(220593, 2024);

      // Assert
      expect(result).toMatchObject({
        exercicioAnoCompleto: false,
        tetoUf: { amountCents: 4188651 * 5, monthCount: 5 },
      });
    });
  });

  describe('quando a fonte não contém todos os gastos do SIGEPA', () => {
    it('marca 2025 a partir de agosto e publica o total sem a mediana', async () => {
      // Arrange
      const service = createService(
        fakeRepository({
          loadDeputadoPerfil: async () => perfilSource(),
          loadDeputadoCeapSource: async () => ({
            coberturas: [
              {
                year: 2025,
                coveredThroughMonth: 12,
                sigepaReposto: false,
                sigepaCoveredThroughMonth: null,
              },
            ],
            gasto: {
              siglaUf: 'MG',
              gastosJson: { '8': { '1': 10000 } },
            },
            gastosSigepaJson: null,
            categorias: [
              { externalNumSubCota: 1, description: 'Combustíveis' },
            ],
            medianaUf: { amountUsedCents: 9500, deputadoCount: 53 },
            intervalosExercicio: [
              { openedAt: '2023-02-02T00:00:00.000Z', closedAt: null },
            ],
            datasInicioLegislatura: [],
          }),
        }),
      );

      // Act
      const result = await service.ceap(220593, 2025);

      // Assert
      expect(result).toMatchObject({
        sigepaDataStatus: 'incompleto',
        exercicioAnoCompleto: true,
        totalAmountUsedCents: 10000,
        medianaUf: null,
      });
    });

    it('mantém julho de 2025 como completo', async () => {
      // Arrange
      const service = createService(
        fakeRepository({
          loadDeputadoPerfil: async () => perfilSource(),
          loadDeputadoCeapSource: async () => ({
            coberturas: [
              {
                year: 2025,
                coveredThroughMonth: 7,
                sigepaReposto: false,
                sigepaCoveredThroughMonth: null,
              },
            ],
            gasto: {
              siglaUf: 'MG',
              gastosJson: { '7': { '1': 10000 } },
            },
            gastosSigepaJson: null,
            categorias: [
              { externalNumSubCota: 1, description: 'Combustíveis' },
            ],
            medianaUf: { amountUsedCents: 9500, deputadoCount: 53 },
            intervalosExercicio: [
              { openedAt: '2023-02-02T00:00:00.000Z', closedAt: null },
            ],
            datasInicioLegislatura: [],
          }),
        }),
      );

      // Act
      const result = await service.ceap(220593, 2025);

      // Assert
      expect(result).toMatchObject({
        sigepaDataStatus: 'completo',
        medianaUf: { amountUsedCents: 9500, deputadoCount: 53 },
      });
    });
  });

  describe('quando o ano da janela está reposto', () => {
    it('substitui a categoria 998 do dump pela reposição, mês a mês e no total', async () => {
      // Arrange
      const service = createService(
        fakeRepository({
          loadDeputadoPerfil: async () => perfilSource(),
          loadDeputadoCeapSource: async () => ({
            coberturas: [
              {
                year: 2025,
                coveredThroughMonth: 9,
                sigepaReposto: true,
                sigepaCoveredThroughMonth: 9,
              },
            ],
            gasto: {
              siglaUf: 'MG',
              gastosJson: {
                '7': { '1': 1000, '998': 40000 },
                '8': { '1': 2000, '998': -2500 },
                '9': { '998': -1000 },
              },
            },
            gastosSigepaJson: { '7': 999999, '8': 700000, '9': 120000 },
            categorias: [
              { externalNumSubCota: 1, description: 'Combustíveis' },
              {
                externalNumSubCota: 998,
                description: 'PASSAGEM AÉREA - SIGEPA',
              },
            ],
            medianaUf: { amountUsedCents: 9500, deputadoCount: 53 },
            intervalosExercicio: [
              { openedAt: '2023-02-02T00:00:00.000Z', closedAt: null },
            ],
            datasInicioLegislatura: [],
          }),
        }),
      );

      // Act
      const result = await service.ceap(220593, 2025);

      // Assert
      expect(result).toMatchObject({
        status: 'ok',
        sigepaDataStatus: 'completo',
        totalAmountUsedCents: 1000 + 40000 + 2000 + 700000 + 120000,
        categories: [
          {
            externalNumSubCota: 1,
            description: 'Combustíveis',
            amountUsedCents: 3000,
          },
          {
            externalNumSubCota: 998,
            description: 'PASSAGEM AÉREA - SIGEPA',
            amountUsedCents: 40000 + 700000 + 120000,
          },
        ],
      });
      expect('months' in result ? result.months.slice(6, 9) : []).toEqual([
        {
          month: 7,
          totalAmountUsedCents: 41000,
          categories: [
            { externalNumSubCota: 1, amountUsedCents: 1000 },
            { externalNumSubCota: 998, amountUsedCents: 40000 },
          ],
        },
        {
          month: 8,
          totalAmountUsedCents: 702000,
          categories: [
            { externalNumSubCota: 1, amountUsedCents: 2000 },
            { externalNumSubCota: 998, amountUsedCents: 700000 },
          ],
        },
        {
          month: 9,
          totalAmountUsedCents: 120000,
          categories: [{ externalNumSubCota: 998, amountUsedCents: 120000 }],
        },
      ]);
    });

    it('publica o gasto do deputado que só aparece na reposição', async () => {
      // Arrange
      const service = createService(
        fakeRepository({
          loadDeputadoPerfil: async () => perfilSource(),
          loadDeputadoCeapSource: async () => ({
            coberturas: [
              {
                year: 2025,
                coveredThroughMonth: 9,
                sigepaReposto: true,
                sigepaCoveredThroughMonth: 9,
              },
            ],
            gasto: null,
            gastosSigepaJson: { '9': 120000 },
            categorias: [
              {
                externalNumSubCota: 998,
                description: 'PASSAGEM AÉREA - SIGEPA',
              },
            ],
            medianaUf: null,
            intervalosExercicio: [
              { openedAt: '2023-02-02T00:00:00.000Z', closedAt: null },
            ],
            datasInicioLegislatura: [],
          }),
        }),
      );

      // Act
      const result = await service.ceap(220593, 2025);

      // Assert
      expect(result).toMatchObject({
        status: 'ok',
        siglaUf: null,
        totalAmountUsedCents: 120000,
        categories: [
          {
            externalNumSubCota: 998,
            description: 'PASSAGEM AÉREA - SIGEPA',
            amountUsedCents: 120000,
          },
        ],
      });
    });
  });

  describe('quando o ano da janela ainda não está reposto', () => {
    it('lê o dump puro, com os estornos negativos da categoria 998', async () => {
      // Arrange
      const service = createService(
        fakeRepository({
          loadDeputadoPerfil: async () => perfilSource(),
          loadDeputadoCeapSource: async () => ({
            coberturas: [
              {
                year: 2025,
                coveredThroughMonth: 9,
                sigepaReposto: false,
                sigepaCoveredThroughMonth: null,
              },
            ],
            gasto: {
              siglaUf: 'MG',
              gastosJson: { '8': { '1': 2000, '998': -2500 } },
            },
            gastosSigepaJson: { '8': 700000 },
            categorias: [
              { externalNumSubCota: 1, description: 'Combustíveis' },
              {
                externalNumSubCota: 998,
                description: 'PASSAGEM AÉREA - SIGEPA',
              },
            ],
            medianaUf: { amountUsedCents: 9500, deputadoCount: 53 },
            intervalosExercicio: [
              { openedAt: '2023-02-02T00:00:00.000Z', closedAt: null },
            ],
            datasInicioLegislatura: [],
          }),
        }),
      );

      // Act
      const result = await service.ceap(220593, 2025);

      // Assert
      expect(result).toMatchObject({
        sigepaDataStatus: 'incompleto',
        totalAmountUsedCents: -500,
        categories: [
          {
            externalNumSubCota: 1,
            description: 'Combustíveis',
            amountUsedCents: 2000,
          },
          {
            externalNumSubCota: 998,
            description: 'PASSAGEM AÉREA - SIGEPA',
            amountUsedCents: -2500,
          },
        ],
      });
    });
  });

  describe('quando o deputado exerceu parte do ano carregado', () => {
    it('resume os dias exercidos ao lado da mediana da UF', async () => {
      // Arrange
      const service = createService(
        fakeRepository({
          loadDeputadoPerfil: async () => perfilSource(),
          loadDeputadoCeapSource: async () => ({
            coberturas: [
              {
                year: 2024,
                coveredThroughMonth: 12,
                sigepaReposto: false,
                sigepaCoveredThroughMonth: null,
              },
            ],
            gasto: {
              siglaUf: 'MG',
              gastosJson: { '8': { '1': 10000 } },
            },
            gastosSigepaJson: null,
            categorias: [
              { externalNumSubCota: 1, description: 'Combustíveis' },
            ],
            medianaUf: { amountUsedCents: 9500, deputadoCount: 53 },
            intervalosExercicio: [
              {
                openedAt: '2024-11-01T12:00:00.000Z',
                closedAt: '2024-12-01T12:00:00.000Z',
              },
              {
                openedAt: '2024-08-01T12:00:00.000Z',
                closedAt: '2024-10-01T12:00:00.000Z',
              },
            ],
            datasInicioLegislatura: [],
          }),
        }),
      );

      // Act
      const result = await service.ceap(220593, 2024);

      // Assert
      expect(result).toMatchObject({
        exercicioAnoCompleto: false,
        diasEmExercicio: 91,
        diasNaJanela: 366,
        medianaUf: { amountUsedCents: 9500, deputadoCount: 53 },
      });
    });
  });

  describe('quando mais de cinco categorias têm gastos', () => {
    it('não aplica o agrupamento de apresentação no endpoint', async () => {
      // Arrange
      const categorias = Array.from({ length: 6 }, (_, index) => ({
        externalNumSubCota: index + 1,
        description: `Categoria ${index + 1}`,
      }));
      const service = createService(
        fakeRepository({
          loadDeputadoPerfil: async () => perfilSource(),
          loadDeputadoCeapSource: async () => ({
            coberturas: [
              {
                year: 2024,
                coveredThroughMonth: 12,
                sigepaReposto: false,
                sigepaCoveredThroughMonth: null,
              },
            ],
            gasto: {
              siglaUf: 'MG',
              gastosJson: {
                '1': Object.fromEntries(
                  categorias.map((item) => [item.externalNumSubCota, 100]),
                ),
              },
            },
            gastosSigepaJson: null,
            categorias,
            medianaUf: { amountUsedCents: 9500, deputadoCount: 53 },
            intervalosExercicio: [
              { openedAt: '2023-02-02T00:00:00.000Z', closedAt: null },
            ],
            datasInicioLegislatura: [],
          }),
        }),
      );

      // Act
      const result = await service.ceap(220593, 2024);

      // Assert
      expect('categories' in result ? result.categories : []).toHaveLength(6);
      expect(
        'categories' in result
          ? result.categories.map((item) => item.externalNumSubCota)
          : [],
      ).toEqual([1, 2, 3, 4, 5, 6]);
    });
  });
});
