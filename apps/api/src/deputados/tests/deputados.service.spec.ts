import type { DeputadosRepository } from '../deputados.repository';
import { DeputadosService } from '../deputados.service';

function fakeRepository(
  overrides: Partial<DeputadosRepository>,
): DeputadosRepository {
  return {
    loadDeputadosFeed: async () => {
      throw new Error('should not load the full feed payload');
    },
    loadUfsDisponiveis: async () => [],
    loadPartidosDisponiveis: async () => [],
    loadDeputadoPerfil: async () => null,
    loadResumoPresenca: async () => null,
    ...overrides,
  };
}

describe('DeputadosService availability lists', () => {
  describe('when deriving available UFs', () => {
    it('uses the dedicated distinct-uf source, not the full feed payload', async () => {
      // Arrange
      const service = new DeputadosService(
        fakeRepository({ loadUfsDisponiveis: async () => ['SP', 'RJ'] }),
      );

      // Act
      const result = await service.ufsDisponiveis();

      // Assert
      expect(result.items).toEqual([{ siglaUf: 'RJ' }, { siglaUf: 'SP' }]);
    });
  });

  describe('when deriving available partidos', () => {
    it('uses the dedicated distinct-partido source, not the full feed payload', async () => {
      // Arrange
      const service = new DeputadosService(
        fakeRepository({
          loadPartidosDisponiveis: async () => ['PT', 'PSOL'],
        }),
      );

      // Act
      const result = await service.partidosDisponiveis();

      // Assert
      expect(result.items).toEqual([
        { siglaPartido: 'PSOL' },
        { siglaPartido: 'PT' },
      ]);
    });
  });
});
