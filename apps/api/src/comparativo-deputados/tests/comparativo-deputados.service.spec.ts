import { BadRequestException, NotFoundException } from '@nestjs/common';

import type { DeputadosRepository } from '@/deputados/deputados.repository';
import type { DeputadoPerfilSource } from '@/deputados/types/deputados.types';

import { ComparativoDeputadosService } from '../comparativo-deputados.service';

const LEGISLATURA_56 = { dataInicio: '2019-02-01', dataFim: '2023-01-31' };
const LEGISLATURA_57 = { dataInicio: '2023-02-01', dataFim: '2027-01-31' };
const LEGISLATURA_54 = { dataInicio: '2011-02-01', dataFim: '2015-01-31' };

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
    ...overrides,
  };
}

describe('comparativo de deputados', () => {
  describe('quando os deputados compartilham anos', () => {
    it('aplica o ano coberto mais recente da interseção', async () => {
      // Arrange
      const service = new ComparativoDeputadosService(
        createRepository([perfilSource(1), perfilSource(2)]),
      );

      // Act
      const response = await service.comparativo([1, 2]);

      // Assert
      expect(response.year).toBe(new Date().getFullYear());
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

    it('publica as métricas do ano para cada deputado', async () => {
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
      const response = await service.comparativo([1, 2], 2025);

      // Assert
      expect(response.items[0].proposicoesAssinadas).toEqual({
        year: 2025,
        disponivel: true,
        total: 4,
        totalPrimeiroSignatario: 1,
        coveredThroughDate: '2025-08-14',
      });
    });

    it('recusa um ano fora da interseção', async () => {
      // Arrange
      const service = new ComparativoDeputadosService(
        createRepository([perfilSource(1), perfilSource(2)]),
      );

      // Act
      const comparativo = service.comparativo([1, 2], 2010);

      // Assert
      await expect(comparativo).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('quando os mandatos não se sobrepõem', () => {
    it('mantém identidade e presença sem nenhuma métrica do ano', async () => {
      // Arrange
      const service = new ComparativoDeputadosService(
        createRepository([
          perfilSource(1),
          perfilSource(2, {
            legislaturaInicialPeriodo: LEGISLATURA_54,
            legislaturaFinalPeriodo: LEGISLATURA_54,
          }),
        ]),
      );

      // Act
      const response = await service.comparativo([1, 2]);

      // Assert
      expect({
        year: response.year,
        comparableYears: response.comparableYears,
        proposicoesAssinadas: response.items[0].proposicoesAssinadas,
        orgaos: response.items[0].orgaos,
        cota: response.items[0].cota,
        resumoPresencaDisponivel: response.items[0].resumoPresencaDisponivel,
      }).toEqual({
        year: null,
        comparableYears: [],
        proposicoesAssinadas: null,
        orgaos: null,
        cota: null,
        resumoPresencaDisponivel: true,
      });
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
