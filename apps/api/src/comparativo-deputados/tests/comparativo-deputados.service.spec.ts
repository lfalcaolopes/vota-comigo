import { NotFoundException } from '@nestjs/common';

import type { DeputadosRepository } from '@/deputados/deputados.repository';
import type {
  DeputadoPerfilSource,
  LegislaturaSource,
} from '@/deputados/types/deputados.types';
import type { IntervaloExercicio } from '@/exercicio/types/exercicio.types';

import { ComparativoDeputadosService } from '../comparativo-deputados.service';

const LEGISLATURA_54 = { dataInicio: '2011-02-01', dataFim: '2015-01-31' };
const LEGISLATURA_55 = { dataInicio: '2015-02-01', dataFim: '2019-01-31' };
const LEGISLATURA_56 = { dataInicio: '2019-02-01', dataFim: '2023-01-31' };
const LEGISLATURA_57 = { dataInicio: '2023-02-01', dataFim: '2027-01-31' };

const LEGISLATURAS: readonly LegislaturaSource[] = [
  { externalIdLegislatura: 54, ...LEGISLATURA_54 },
  { externalIdLegislatura: 55, ...LEGISLATURA_55 },
  { externalIdLegislatura: 56, ...LEGISLATURA_56 },
  { externalIdLegislatura: 57, ...LEGISLATURA_57 },
];

const INTERVALO_57_ENCERRADO: IntervaloExercicio = {
  openedAt: '2023-02-01T12:00:01Z',
  closedAt: '2025-04-10T00:00:00Z',
};

function perfilSource(
  externalIdDeputado: number,
  overrides: Partial<DeputadoPerfilSource> = {},
): DeputadoPerfilSource {
  return {
    id: `deputado-${externalIdDeputado}`,
    externalIdDeputado,
    nome: `Deputado ${externalIdDeputado}`,
    nomeCivil: `Deputado ${externalIdDeputado} da Silva`,
    dataNascimento: null,
    municipioNascimento: null,
    ufNascimento: null,
    urlRedeSocial: null,
    externalIdLegislaturaInicial: 56,
    externalIdLegislaturaFinal: 57,
    legislaturaInicialPeriodo: LEGISLATURA_56,
    legislaturaFinalPeriodo: LEGISLATURA_57,
    eventos: [],
    ...overrides,
  };
}

function createRepository(
  sources: readonly DeputadoPerfilSource[],
  overrides: Partial<DeputadosRepository> = {},
): DeputadosRepository {
  return {
    loadDeputadosFeed: async () => ({ items: [], total: 0 }),
    loadUfsDisponiveis: async () => [],
    loadPartidosDisponiveis: async () => [],
    loadDeputadoPerfil: async (externalIdDeputado) =>
      sources.find(
        (source) => source.externalIdDeputado === externalIdDeputado,
      ) ?? null,
    loadResumoPresenca: async () => ({
      presencas: 90,
      ausenciasSemMotivoConhecido: 10,
    }),
    loadDeputadoCeapSource: async () => ({
      coberturas: [],
      gasto: null,
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
    loadLegislaturas: async () => LEGISLATURAS,
    loadIntervalosExercicio: async () => [INTERVALO_57_ENCERRADO],
    ...overrides,
  };
}

describe('comparativo de deputados', () => {
  describe('quando a janela do deputado está disponível', () => {
    it('aplica o último ano da janela para cada deputado', async () => {
      // Arrange
      const service = new ComparativoDeputadosService(
        createRepository([perfilSource(1), perfilSource(2)]),
      );

      // Act
      const response = await service.comparativo([1, 2]);

      // Assert
      const janela = response.items[0].janela;
      expect(janela).toMatchObject({
        status: 'disponivel',
        legislatura: 57,
        dataInicio: LEGISLATURA_57.dataInicio,
        dataFim: '2025-04-10T00:00:00.000Z',
        encerrada: true,
        diasEmExercicioDisponivel: true,
      });
      expect(
        janela.status === 'disponivel' ? janela.diasEmExercicio : null,
      ).toEqual(expect.any(Number));
    });

    it('preserva a ordem dos deputados pedidos', async () => {
      // Arrange
      const service = new ComparativoDeputadosService(
        createRepository([perfilSource(1), perfilSource(2), perfilSource(3)]),
      );

      // Act
      const response = await service.comparativo([3, 1]);

      // Assert
      expect(response.items.map((item) => item.externalIdDeputado)).toEqual([
        3, 1,
      ]);
    });

    it('publica as métricas do último ano da janela para cada deputado', async () => {
      // Arrange
      const service = new ComparativoDeputadosService(
        createRepository([perfilSource(1), perfilSource(2)], {
          loadDeputadoProposicoesAssinadasSource: async () => ({
            anoCoberto: true,
            assinaturasJson: { '2025-03-04': [4, 1] },
            coveredThroughDate: '2025-08-14',
          }),
        }),
      );

      // Act
      const response = await service.comparativo([1, 2]);

      // Assert
      expect(response.items[0].proposicoesAssinadas).toEqual({
        disponivel: true,
        total: 4,
        totalPrimeiroSignatario: 1,
        coveredThroughDate: '2025-08-14',
      });
    });
  });

  describe('quando o deputado está abaixo do piso da 55ª legislatura', () => {
    it('mantém identidade e presença sem nenhuma métrica da janela', async () => {
      // Arrange
      const service = new ComparativoDeputadosService(
        createRepository(
          [
            perfilSource(1),
            perfilSource(2, {
              externalIdLegislaturaFinal: 54,
              legislaturaFinalPeriodo: LEGISLATURA_54,
            }),
          ],
          {
            loadIntervalosExercicio: async (deputadoId) =>
              deputadoId === 'deputado-2' ? [] : [INTERVALO_57_ENCERRADO],
          },
        ),
      );

      // Act
      const response = await service.comparativo([1, 2]);

      // Assert
      expect({
        janela: response.items[1].janela,
        proposicoesAssinadas: response.items[1].proposicoesAssinadas,
        orgaos: response.items[1].orgaos,
        cota: response.items[1].cota,
        resumoPresencaDisponivel: response.items[1].resumoPresencaDisponivel,
      }).toEqual({
        janela: {
          status: 'indisponivel',
          motivo: 'legislatura-anterior-a-cobertura',
          ultimaLegislatura: 54,
        },
        proposicoesAssinadas: null,
        orgaos: null,
        cota: null,
        resumoPresencaDisponivel: true,
      });
    });
  });

  describe('quando as janelas dos deputados divergem', () => {
    it('marca janelasCoincidem como falso quando as legislaturas diferem', async () => {
      // Arrange
      const service = new ComparativoDeputadosService(
        createRepository([perfilSource(1), perfilSource(2)], {
          loadIntervalosExercicio: async (deputadoId) =>
            deputadoId === 'deputado-2'
              ? [
                  {
                    openedAt: '2019-02-01T12:00:01Z',
                    closedAt: '2022-06-15T00:00:00Z',
                  },
                ]
              : [INTERVALO_57_ENCERRADO],
        }),
      );

      // Act
      const response = await service.comparativo([1, 2]);

      // Assert
      expect(response.janelasCoincidem).toBe(false);
    });

    it('marca janelasCoincidem como verdadeiro quando as legislaturas coincidem', async () => {
      // Arrange
      const service = new ComparativoDeputadosService(
        createRepository([perfilSource(1), perfilSource(2)]),
      );

      // Act
      const response = await service.comparativo([1, 2]);

      // Assert
      expect(response.janelasCoincidem).toBe(true);
    });
  });

  describe('quando um deputado não existe', () => {
    it('recusa a comparação inteira', async () => {
      // Arrange
      const service = new ComparativoDeputadosService(
        createRepository([perfilSource(1)]),
      );

      // Act
      const comparativo = service.comparativo([1, 2]);

      // Assert
      await expect(comparativo).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
