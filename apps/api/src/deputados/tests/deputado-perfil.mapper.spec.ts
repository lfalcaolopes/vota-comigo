import { deputadoPerfilSchema } from '@vota-comigo/shared-types';

import { toDeputadoPerfil } from '../mappers/deputado-perfil.mapper';
import type { DeputadoPerfilSource } from '../types/deputados.types';

function source(
  overrides: Partial<DeputadoPerfilSource> = {},
): DeputadoPerfilSource {
  return {
    externalIdDeputado: 220593,
    nome: 'Maria da Silva',
    nomeCivil: 'Maria Aparecida da Silva',
    temHistoricoParlamentar: true,
    ...overrides,
  };
}

describe('toDeputadoPerfil', () => {
  describe('when the deputado has parliamentary history', () => {
    it('maps a registered deputado into a valid perfil with the official source link', () => {
      // Arrange
      const row = source();

      // Act
      const perfil = toDeputadoPerfil(row);

      // Assert
      expect(deputadoPerfilSchema.parse(perfil)).toEqual({
        externalIdDeputado: 220593,
        nomePublico: 'Maria da Silva',
        nomeCivil: 'Maria Aparecida da Silva',
        fonteOficial: 'https://www.camara.leg.br/deputados/220593',
        historicoParlamentarDisponivel: true,
      });
    });
  });

  describe('when the deputado has no parliamentary history', () => {
    it('still produces a perfil flagging the parliamentary history as unavailable', () => {
      // Arrange
      const row = source({ temHistoricoParlamentar: false });

      // Act
      const perfil = toDeputadoPerfil(row);

      // Assert
      expect(perfil.historicoParlamentarDisponivel).toBe(false);
      expect(deputadoPerfilSchema.safeParse(perfil).success).toBe(true);
    });
  });

  describe('when neither nome nor nomeCivil is registered', () => {
    it('maps the public name to null', () => {
      // Arrange
      const row = source({ nome: null, nomeCivil: null });

      // Act
      const perfil = toDeputadoPerfil(row);

      // Assert
      expect(perfil.nomePublico).toBeNull();
    });
  });
});
