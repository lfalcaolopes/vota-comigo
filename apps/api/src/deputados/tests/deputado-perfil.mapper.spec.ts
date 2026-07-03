import { deputadoPerfilSchema } from '@vota-comigo/shared-types';

import { toDeputadoPerfil } from '../mappers/deputado-perfil.mapper';
import type {
  DeputadoHistoricoEventoSource,
  DeputadoPerfilSource,
} from '../types/deputados.types';

function evento(
  overrides: Partial<DeputadoHistoricoEventoSource> = {},
): DeputadoHistoricoEventoSource {
  return {
    dataHora: '2023-01-01T00:00:00+00:00',
    situacao: 'Exercício',
    descricaoStatus: 'Exercício',
    nomeEleitoral: 'Maria da Silva',
    siglaPartido: 'PT',
    siglaUf: 'SP',
    urlFoto: 'https://example.com/foto.jpg',
    ...overrides,
  };
}

function source(
  overrides: Partial<DeputadoPerfilSource> = {},
): DeputadoPerfilSource {
  return {
    id: 'aaaaaaaa-0000-0000-0000-000000000001',
    externalIdDeputado: 220593,
    nome: 'Maria Nome Cadastro',
    nomeCivil: 'Maria Aparecida da Silva',
    dataNascimento: '1980-05-10',
    municipioNascimento: 'São Paulo',
    ufNascimento: 'SP',
    urlRedeSocial: 'https://twitter.com/maria',
    externalIdLegislaturaInicial: 55,
    externalIdLegislaturaFinal: 57,
    legislaturaInicialPeriodo: {
      dataInicio: '2015-02-01',
      dataFim: '2019-01-31',
    },
    legislaturaFinalPeriodo: {
      dataInicio: '2023-02-01',
      dataFim: '2027-01-31',
    },
    eventos: [evento()],
    ...overrides,
  };
}

describe('toDeputadoPerfil', () => {
  describe('when the deputado has history events', () => {
    it('produces a valid perfil that parses against the schema', () => {
      // Arrange
      const row = source();

      // Act
      const perfil = toDeputadoPerfil(row, null);

      // Assert
      expect(() => deputadoPerfilSchema.parse(perfil)).not.toThrow();
    });

    it('populates snapshotPublico from the most recent event', () => {
      // Arrange
      const row = source({
        eventos: [
          evento({
            dataHora: '2021-01-01T00:00:00+00:00',
            nomeEleitoral: 'Maria Antiga',
            siglaPartido: 'MDB',
            siglaUf: 'RJ',
            urlFoto: null,
          }),
          evento({
            dataHora: '2023-06-15T10:00:00+00:00',
            nomeEleitoral: 'Maria da Silva',
            siglaPartido: 'PT',
            siglaUf: 'SP',
            urlFoto: 'https://example.com/foto.jpg',
          }),
        ],
      });

      // Act
      const perfil = toDeputadoPerfil(row, null);

      // Assert
      expect(perfil.snapshotPublicoDisponivel).toBe(true);
      expect(perfil.snapshotPublico).toEqual({
        nomeEleitoral: 'Maria da Silva',
        siglaPartido: 'PT',
        siglaUf: 'SP',
        urlFoto: 'https://example.com/foto.jpg',
      });
    });

    it('derives nomePublico from nomeEleitoral in the snapshot', () => {
      // Arrange
      const row = source({
        nome: 'Maria Nome Cadastro',
        eventos: [evento({ nomeEleitoral: 'Maria Eleitoral' })],
      });

      // Act
      const perfil = toDeputadoPerfil(row, null);

      // Assert
      expect(perfil.nomePublico).toBe('Maria Eleitoral');
    });

    it('derives emAtividade as true when the last interval has no closedAt', () => {
      // Arrange
      const row = source({
        eventos: [
          evento({
            dataHora: '2023-01-01T00:00:00+00:00',
            situacao: 'Exercício',
            descricaoStatus: 'Entrada - Posse',
          }),
        ],
      });

      // Act
      const perfil = toDeputadoPerfil(row, null);

      // Assert
      expect(perfil.emAtividade).toBe(true);
    });

    it('derives emAtividade as false when all intervals are closed', () => {
      // Arrange
      const row = source({
        eventos: [
          evento({
            dataHora: '2019-02-01T00:00:00+00:00',
            situacao: 'Exercício',
            descricaoStatus: 'Entrada - Posse',
          }),
          evento({
            dataHora: '2023-01-31T00:00:00+00:00',
            situacao: 'Fim de Mandato',
            descricaoStatus: 'Saída - Fim de Mandato',
          }),
        ],
      });

      // Act
      const perfil = toDeputadoPerfil(row, null);

      // Assert
      expect(perfil.emAtividade).toBe(false);
    });

    it('maps redesSociais from urlRedeSocial', () => {
      // Arrange
      const row = source({
        urlRedeSocial: 'https://twitter.com/maria,https://instagram.com/maria',
      });

      // Act
      const perfil = toDeputadoPerfil(row, null);

      // Assert
      expect(perfil.redesSociais).toEqual([
        'https://twitter.com/maria',
        'https://instagram.com/maria',
      ]);
    });

    it('maps nascimento and legislatura metadata', () => {
      // Arrange
      const row = source();

      // Act
      const perfil = toDeputadoPerfil(row, null);

      // Assert
      expect(perfil.dataNascimento).toBe('1980-05-10');
      expect(perfil.municipioNascimento).toBe('São Paulo');
      expect(perfil.ufNascimento).toBe('SP');
      expect(perfil.externalIdLegislaturaInicial).toBe(55);
      expect(perfil.externalIdLegislaturaFinal).toBe(57);
      expect(perfil.legislaturaInicialPeriodo).toEqual({
        dataInicio: '2015-02-01',
        dataFim: '2019-01-31',
      });
      expect(perfil.legislaturaFinalPeriodo).toEqual({
        dataInicio: '2023-02-01',
        dataFim: '2027-01-31',
      });
    });
  });

  describe('when the deputado has no history events', () => {
    it('sets snapshotPublico to null and snapshotPublicoDisponivel to false', () => {
      // Arrange
      const row = source({ eventos: [] });

      // Act
      const perfil = toDeputadoPerfil(row, null);

      // Assert
      expect(perfil.snapshotPublico).toBeNull();
      expect(perfil.snapshotPublicoDisponivel).toBe(false);
      expect(perfil.historicoParlamentarDisponivel).toBe(false);
    });

    it('falls back to nome for nomePublico when there is no snapshot', () => {
      // Arrange
      const row = source({
        nome: 'Maria Nome Cadastro',
        nomeCivil: 'Maria Civil',
        eventos: [],
      });

      // Act
      const perfil = toDeputadoPerfil(row, null);

      // Assert
      expect(perfil.nomePublico).toBe('Maria Nome Cadastro');
    });

    it('still maps cadastral metadata even without events', () => {
      // Arrange
      const row = source({ eventos: [] });

      // Act
      const perfil = toDeputadoPerfil(row, null);

      // Assert
      expect(perfil.dataNascimento).toBe('1980-05-10');
      expect(perfil.externalIdLegislaturaInicial).toBe(55);
      expect(deputadoPerfilSchema.safeParse(perfil).success).toBe(true);
    });
  });

  describe('when neither nome nor nomeCivil is present and there is no snapshot', () => {
    it('maps the public name to null', () => {
      // Arrange
      const row = source({ nome: null, nomeCivil: null, eventos: [] });

      // Act
      const perfil = toDeputadoPerfil(row, null);

      // Assert
      expect(perfil.nomePublico).toBeNull();
    });
  });

  describe('resumo de presenca', () => {
    describe('when a stored presenca row is provided', () => {
      it('maps it and derives total and percentual', () => {
        // Arrange
        const row = source();

        // Act
        const perfil = toDeputadoPerfil(row, {
          presencas: 3,
          ausenciasSemMotivoConhecido: 1,
        });

        // Assert
        expect(perfil.resumoPresencaDisponivel).toBe(true);
        expect(perfil.resumoPresenca).toEqual({
          percentualPresenca: 75,
          presencas: 3,
          totalVotacoesEmExercicio: 4,
          ausenciasSemMotivoConhecido: 1,
        });
        expect(deputadoPerfilSchema.safeParse(perfil).success).toBe(true);
      });
    });

    describe('when no presenca row is provided', () => {
      it('sets resumoPresencaDisponivel false and resumoPresenca null', () => {
        // Arrange
        const row = source();

        // Act
        const perfil = toDeputadoPerfil(row, null);

        // Assert
        expect(perfil.resumoPresencaDisponivel).toBe(false);
        expect(perfil.resumoPresenca).toBeNull();
        expect(deputadoPerfilSchema.safeParse(perfil).success).toBe(true);
      });
    });
  });

  describe('historico partidario', () => {
    describe('when the deputado changed party over time', () => {
      it('builds periods from most recent to oldest and flags the current party', () => {
        // Arrange
        const row = source({
          eventos: [
            evento({
              dataHora: '2019-02-01T00:00:00+00:00',
              siglaPartido: 'MDB',
            }),
            evento({
              dataHora: '2021-02-01T00:00:00+00:00',
              siglaPartido: 'PT',
            }),
          ],
        });

        // Act
        const perfil = toDeputadoPerfil(row, null);

        // Assert
        expect(perfil.historicoPartidarioDisponivel).toBe(true);
        expect(perfil.historicoPartidario).toEqual([
          {
            siglaPartido: 'PT',
            dataInicio: '2021-02-01',
            dataFim: null,
            atual: true,
          },
          {
            siglaPartido: 'MDB',
            dataInicio: '2019-02-01',
            dataFim: '2021-02-01',
            atual: false,
          },
        ]);
        expect(deputadoPerfilSchema.safeParse(perfil).success).toBe(true);
      });
    });

    describe('when no event has a resolved partido', () => {
      it('flags the historico as unavailable with an empty list', () => {
        // Arrange
        const row = source({
          eventos: [
            evento({
              dataHora: '2021-02-01T00:00:00+00:00',
              siglaPartido: null,
            }),
          ],
        });

        // Act
        const perfil = toDeputadoPerfil(row, null);

        // Assert
        expect(perfil.historicoPartidarioDisponivel).toBe(false);
        expect(perfil.historicoPartidario).toEqual([]);
        expect(deputadoPerfilSchema.safeParse(perfil).success).toBe(true);
      });
    });
  });
});
