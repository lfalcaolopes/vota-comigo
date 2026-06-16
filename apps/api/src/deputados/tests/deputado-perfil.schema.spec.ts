import {
  type DeputadoPerfil,
  deputadoPerfilSchema,
} from '@vota-comigo/shared-types';

function perfil(overrides: Partial<DeputadoPerfil> = {}): DeputadoPerfil {
  return {
    externalIdDeputado: 220593,
    nomePublico: 'Maria da Silva',
    nomeCivil: 'Maria Aparecida da Silva',
    fonteOficial: 'https://www.camara.leg.br/deputados/220593',
    historicoParlamentarDisponivel: true,
    snapshotPublicoDisponivel: true,
    snapshotPublico: {
      nomeEleitoral: 'Maria da Silva',
      siglaPartido: 'PT',
      siglaUf: 'SP',
      urlFoto: 'https://example.com/foto.jpg',
    },
    emAtividade: true,
    redesSociais: ['https://twitter.com/maria'],
    dataNascimento: '1980-05-10',
    municipioNascimento: 'São Paulo',
    ufNascimento: 'SP',
    externalIdLegislaturaInicial: 55,
    externalIdLegislaturaFinal: 57,
    resumoPresencaDisponivel: true,
    resumoPresenca: {
      percentualPresenca: 80,
      presencas: 80,
      totalVotacoesEmExercicio: 100,
      ausenciasSemMotivoConhecido: 20,
    },
    historicoPartidarioDisponivel: true,
    historicoPartidario: [
      {
        siglaPartido: 'PT',
        dataInicio: '2021-02-01',
        dataFim: null,
        atual: true,
      },
    ],
    ...overrides,
  };
}

describe('deputadoPerfilSchema invariants', () => {
  describe('a coherent perfil', () => {
    it('accepts a complete perfil with every flag matching its data', () => {
      // Act
      const result = deputadoPerfilSchema.safeParse(perfil());

      // Assert
      expect(result.success).toBe(true);
    });

    it('accepts a perfil with no parliamentary history and every dependent flag false', () => {
      // Arrange
      const semHistorico = perfil({
        historicoParlamentarDisponivel: false,
        snapshotPublicoDisponivel: false,
        snapshotPublico: null,
        resumoPresencaDisponivel: false,
        resumoPresenca: null,
        historicoPartidarioDisponivel: false,
        historicoPartidario: [],
      });

      // Act
      const result = deputadoPerfilSchema.safeParse(semHistorico);

      // Assert
      expect(result.success).toBe(true);
    });
  });

  describe('snapshot flag coupling', () => {
    it('rejects snapshotPublicoDisponivel true with a null snapshot', () => {
      // Act
      const result = deputadoPerfilSchema.safeParse(
        perfil({ snapshotPublicoDisponivel: true, snapshotPublico: null }),
      );

      // Assert
      expect(result.success).toBe(false);
    });

    it('rejects snapshotPublicoDisponivel false with a present snapshot', () => {
      // Act
      const result = deputadoPerfilSchema.safeParse(
        perfil({
          snapshotPublicoDisponivel: false,
          snapshotPublico: {
            nomeEleitoral: 'Maria da Silva',
            siglaPartido: 'PT',
            siglaUf: 'SP',
            urlFoto: null,
          },
        }),
      );

      // Assert
      expect(result.success).toBe(false);
    });
  });

  describe('resumo de presenca flag coupling', () => {
    it('rejects resumoPresencaDisponivel true with a null resumo', () => {
      // Act
      const result = deputadoPerfilSchema.safeParse(
        perfil({ resumoPresencaDisponivel: true, resumoPresenca: null }),
      );

      // Assert
      expect(result.success).toBe(false);
    });

    it('rejects resumoPresencaDisponivel false with a present resumo', () => {
      // Act
      const result = deputadoPerfilSchema.safeParse(
        perfil({
          resumoPresencaDisponivel: false,
          resumoPresenca: {
            percentualPresenca: 80,
            presencas: 80,
            totalVotacoesEmExercicio: 100,
            ausenciasSemMotivoConhecido: 20,
          },
        }),
      );

      // Assert
      expect(result.success).toBe(false);
    });
  });

  describe('historico partidario flag coupling', () => {
    it('rejects historicoPartidarioDisponivel false with a non-empty list', () => {
      // Act
      const result = deputadoPerfilSchema.safeParse(
        perfil({
          historicoPartidarioDisponivel: false,
          historicoPartidario: [
            {
              siglaPartido: 'PT',
              dataInicio: '2021-02-01',
              dataFim: null,
              atual: true,
            },
          ],
        }),
      );

      // Assert
      expect(result.success).toBe(false);
    });

    it('rejects historicoPartidarioDisponivel true with an empty list', () => {
      // Act
      const result = deputadoPerfilSchema.safeParse(
        perfil({
          historicoPartidarioDisponivel: true,
          historicoPartidario: [],
        }),
      );

      // Assert
      expect(result.success).toBe(false);
    });
  });

  describe('parliamentary history guard invariant', () => {
    it('rejects historicoParlamentarDisponivel false while the snapshot stays available', () => {
      // Act
      const result = deputadoPerfilSchema.safeParse(
        perfil({
          historicoParlamentarDisponivel: false,
          snapshotPublicoDisponivel: true,
          resumoPresencaDisponivel: false,
          resumoPresenca: null,
          historicoPartidarioDisponivel: false,
          historicoPartidario: [],
        }),
      );

      // Assert
      expect(result.success).toBe(false);
    });

    it('rejects historicoParlamentarDisponivel false while presenca stays available', () => {
      // Act
      const result = deputadoPerfilSchema.safeParse(
        perfil({
          historicoParlamentarDisponivel: false,
          snapshotPublicoDisponivel: false,
          snapshotPublico: null,
          resumoPresencaDisponivel: true,
          historicoPartidarioDisponivel: false,
          historicoPartidario: [],
        }),
      );

      // Assert
      expect(result.success).toBe(false);
    });

    it('rejects historicoParlamentarDisponivel false while the partidario history stays available', () => {
      // Act
      const result = deputadoPerfilSchema.safeParse(
        perfil({
          historicoParlamentarDisponivel: false,
          snapshotPublicoDisponivel: false,
          snapshotPublico: null,
          resumoPresencaDisponivel: false,
          resumoPresenca: null,
          historicoPartidarioDisponivel: true,
        }),
      );

      // Assert
      expect(result.success).toBe(false);
    });
  });
});
