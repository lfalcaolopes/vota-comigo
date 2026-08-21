import { NotFoundException } from '@nestjs/common';

import type { CotaRepository } from '../cota.repository';
import { CotaService } from '../cota.service';

function repository(overrides: Partial<CotaRepository> = {}): CotaRepository {
  return {
    loadLegislaturas: async () => [
      { legislatura: 57, dataInicio: '2023-02-01', dataFim: '2027-01-31' },
    ],
    loadCoberturas: async () => [
      {
        year: 2023,
        coveredThroughMonth: 12,
        sigepaReposto: false,
        sigepaCoveredThroughMonth: null,
      },
    ],
    loadCategorias: async () => [
      { externalNumSubCota: 1, description: 'MANUTENCAO DE ESCRITORIO' },
    ],
    loadGastos: async () => [
      {
        deputadoId: 'deputado-a',
        year: 2023,
        gastosJson: { '2': { '1': 100_000 } },
      },
    ],
    loadGastosSigepa: async () => [],
    ...overrides,
  };
}

describe('GET /cota/legislatura', () => {
  describe('quando a legislatura em curso tem cobertura', () => {
    it('responde o agregado da legislatura', async () => {
      // Arrange
      const service = new CotaService(repository());

      // Act
      const result = await service.legislatura();

      // Assert
      expect(result).toMatchObject({
        legislatura: 57,
        periodStart: '2023-02-01',
        deputadoCount: 1,
        totalAmountUsedCents: 100_000,
      });
    });

    it('carrega os gastos só dos anos da janela coberta', async () => {
      // Arrange
      const loadGastos = jest.fn().mockResolvedValue([]);
      const service = new CotaService(repository({ loadGastos }));

      // Act
      await service.legislatura();

      // Assert
      expect(loadGastos).toHaveBeenCalledWith([2023]);
    });

    it('reaproveita a agregação entre requisições', async () => {
      // Arrange
      const loadGastos = jest.fn().mockResolvedValue([]);
      const service = new CotaService(repository({ loadGastos }));

      // Act
      await service.legislatura();
      await service.legislatura();

      // Assert
      expect(loadGastos).toHaveBeenCalledTimes(1);
    });
  });

  describe('quando nenhuma legislatura foi carregada', () => {
    it('responde que o agregado não existe', async () => {
      // Arrange
      const service = new CotaService(
        repository({ loadLegislaturas: async () => [] }),
      );

      // Act
      const act = service.legislatura();

      // Assert
      await expect(act).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('quando a legislatura em curso ainda não tem mês carregado', () => {
    it('responde que o agregado não existe', async () => {
      // Arrange
      const service = new CotaService(
        repository({
          loadCoberturas: async () => [
            {
              year: 2019,
              coveredThroughMonth: 12,
              sigepaReposto: false,
              sigepaCoveredThroughMonth: null,
            },
          ],
        }),
      );

      // Act
      const act = service.legislatura();

      // Assert
      await expect(act).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
