import { deriveDeputadoDiscursos } from '../rules/deputado-discursos';

describe('discursos do deputado', () => {
  describe('quando a resposta da Câmara contém transcrição', () => {
    it('publica somente os campos do contrato do produto', () => {
      // Arrange
      const source = [
        {
          dataHoraInicio: '2022-08-16T15:42:00',
          tipoDiscurso: 'Discurso',
          faseEvento: { titulo: 'Ordem do Dia' },
          sumario: 'Defesa da transparência pública.',
          keywords: 'Transparência, Dados públicos',
          transcricao: 'Texto integral que não pode sair do backend.',
          urlVideo: 'https://www.camara.leg.br/video/12345',
          urlAudio: 'https://www.camara.leg.br/audio/12345',
          urlTexto: 'https://www.camara.leg.br/discurso/12345',
        },
      ];

      // Act
      const result = deriveDeputadoDiscursos(source);

      // Assert
      expect(result).toEqual({
        ok: true,
        items: [
          {
            dataHoraInicio: '2022-08-16T15:42:00',
            tipoDiscurso: 'Discurso',
            fase: 'Ordem do Dia',
            sumario: 'Defesa da transparência pública.',
            assuntos: ['Transparência', 'Dados públicos'],
            links: [
              {
                kind: 'video',
                url: 'https://www.camara.leg.br/video/12345',
              },
              {
                kind: 'audio',
                url: 'https://www.camara.leg.br/audio/12345',
              },
              {
                kind: 'text',
                url: 'https://www.camara.leg.br/discurso/12345',
              },
            ],
          },
        ],
      });
    });
  });

  describe('quando o sumário oficial contém espaços e quebras irregulares', () => {
    it('normaliza somente os espaços do texto completo', () => {
      // Arrange
      const source = [
        {
          dataHoraInicio: '2022-08-16T15:42:00',
          tipoDiscurso: 'Discurso',
          sumario:
            '  Defesa da transparência\n pública.   Dados devem permanecer abertos.  ',
        },
      ];

      // Act
      const result = deriveDeputadoDiscursos(source);

      // Assert
      expect(result).toMatchObject({
        ok: true,
        items: [
          {
            sumario:
              'Defesa da transparência pública. Dados devem permanecer abertos.',
          },
        ],
      });
    });
  });

  describe('quando as palavras-chave repetem assuntos com capitalização diferente', () => {
    it('preserva a primeira grafia e a ordem da Câmara', () => {
      // Arrange
      const source = [
        {
          dataHoraInicio: '2022-08-16T15:42:00',
          tipoDiscurso: 'Discurso',
          keywords:
            ' Transparência, dados públicos\ntransparência, , SAÚDE, saúde ',
        },
      ];

      // Act
      const result = deriveDeputadoDiscursos(source);

      // Assert
      expect(result).toMatchObject({
        ok: true,
        items: [
          {
            assuntos: ['Transparência', 'dados públicos', 'SAÚDE'],
          },
        ],
      });
    });
  });

  describe('quando sumário, assuntos, fase e links estão ausentes', () => {
    it('preserva o pronunciamento sem inventar contexto ou URL', () => {
      // Arrange
      const source = [
        {
          dataHoraInicio: '2022-08-16T15:42:00',
          tipoDiscurso: 'Discurso',
          sumario: null,
          keywords: null,
          faseEvento: null,
          urlVideo: null,
          urlAudio: null,
          urlTexto: null,
        },
      ];

      // Act
      const result = deriveDeputadoDiscursos(source);

      // Assert
      expect(result).toEqual({
        ok: true,
        items: [
          {
            dataHoraInicio: '2022-08-16T15:42:00',
            tipoDiscurso: 'Discurso',
            fase: null,
            sumario: null,
            assuntos: [],
            links: [],
          },
        ],
      });
    });
  });

  describe('quando somente alguns formatos do discurso estão disponíveis', () => {
    it.each([
      [false, false, false, []],
      [true, false, false, ['video']],
      [false, true, false, ['audio']],
      [false, false, true, ['text']],
      [true, true, false, ['video', 'audio']],
      [true, false, true, ['video', 'text']],
      [false, true, true, ['audio', 'text']],
      [true, true, true, ['video', 'audio', 'text']],
    ])(
      'ordena vídeo, áudio e texto sem preencher formatos ausentes',
      (hasVideo, hasAudio, hasText, expectedKinds) => {
        // Arrange
        const source = [
          {
            dataHoraInicio: '2022-08-16T15:42:00',
            tipoDiscurso: 'Discurso',
            urlVideo: hasVideo ? 'https://www.camara.leg.br/video/12345' : null,
            urlAudio: hasAudio ? 'https://www.camara.leg.br/audio/12345' : null,
            urlTexto: hasText
              ? 'https://www.camara.leg.br/discurso/12345'
              : null,
          },
        ];

        // Act
        const result = deriveDeputadoDiscursos(source);

        // Assert
        expect(result).toMatchObject({ ok: true });
        if (result.ok) {
          expect(result.items[0].links.map((link) => link.kind)).toEqual(
            expectedKinds,
          );
        }
      },
    );
  });

  describe('quando um registro obrigatório é inválido', () => {
    it('rejeita data ou tipo inválidos sem criar discurso sintético', () => {
      // Arrange
      const valid = {
        dataHoraInicio: '2022-08-16T15:42:00',
        tipoDiscurso: 'Discurso',
      };
      const invalidSources = [
        { ...valid, dataHoraInicio: '2022-02-31T15:42:00' },
        { ...valid, tipoDiscurso: ' ' },
      ];

      // Act
      const results = invalidSources.map((item) =>
        deriveDeputadoDiscursos([item]),
      );

      // Assert
      expect(results).toEqual([
        { ok: false, invalidItemIndex: 0 },
        { ok: false, invalidItemIndex: 0 },
      ]);
    });
  });

  describe('quando um link não aponta para uma página externa segura', () => {
    it('rejeita o registro em vez de publicar um protocolo executável', () => {
      // Arrange
      const source = [
        {
          dataHoraInicio: '2022-08-16T15:42',
          tipoDiscurso: 'Discurso',
          urlTexto: 'javascript:alert(1)',
        },
      ];

      // Act
      const result = deriveDeputadoDiscursos(source);

      // Assert
      expect(result).toEqual({ ok: false, invalidItemIndex: 0 });
    });
  });
});
