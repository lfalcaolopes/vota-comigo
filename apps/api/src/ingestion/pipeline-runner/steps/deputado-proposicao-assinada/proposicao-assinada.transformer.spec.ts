import type { CsvRow } from '../../sources/csv-reader';

import {
  applyProposicoesAno,
  collectAssinaturasDoAno,
  toDeputadoProposicaoAssinadaRows,
  toProposicaoTipoRows,
  type AssinaturaBuckets,
  type PorProposicao,
  type TipoRegistry,
} from './proposicao-assinada.transformer';

const DEPUTADO_A = 'deputado-uuid-A';
const DEPUTADO_B = 'deputado-uuid-B';

function autoresRow(
  overrides: Record<string, string> = {},
  lineNumber = 2,
): CsvRow {
  return {
    lineNumber,
    record: {
      idProposicao: '2642000',
      idDeputadoAutor: '204379',
      ordemAssinatura: '2',
      ...overrides,
    },
  };
}

function proposicoesRow(
  overrides: Record<string, string> = {},
  lineNumber = 2,
): CsvRow {
  return {
    lineNumber,
    record: {
      id: '2642000',
      siglaTipo: 'PL',
      codTipo: '139',
      descricaoTipo: 'Projeto de Lei',
      dataApresentacao: '2025-02-11T17:58:00',
      ...overrides,
    },
  };
}

describe('collectAssinaturasDoAno', () => {
  describe('when the author is an institutional author or unmapped deputado', () => {
    it('ignores the row instead of gapping it', async () => {
      // Arrange
      const deputadoIds = new Map([[204379, DEPUTADO_A]]);
      const rows = [
        autoresRow({ idDeputadoAutor: '' }),
        autoresRow({ idProposicao: '999', idDeputadoAutor: '1' }),
      ];

      // Act
      const result = await collectAssinaturasDoAno({ rows, deputadoIds });

      // Assert
      expect(result.read).toBe(2);
      expect(result.ignored).toBe(2);
      expect(result.porProposicao.size).toBe(0);
    });
  });

  describe('when a deputado signs the same proposicao twice', () => {
    it('collapses into a single entry, OR-ing ordemAssinatura = 1', async () => {
      // Arrange
      const deputadoIds = new Map([[204379, DEPUTADO_A]]);
      const rows = [
        autoresRow({ ordemAssinatura: '3' }),
        autoresRow({ ordemAssinatura: '1' }, 3),
      ];

      // Act
      const result = await collectAssinaturasDoAno({ rows, deputadoIds });

      // Assert
      const porDeputado = result.porProposicao.get(2642000);
      expect(porDeputado?.size).toBe(1);
      expect(porDeputado?.get(DEPUTADO_A)).toBe(true);
    });
  });

  describe('when ordemAssinatura is not 1', () => {
    it('records primeiro as false', async () => {
      // Arrange
      const deputadoIds = new Map([[204379, DEPUTADO_A]]);
      const rows = [autoresRow({ ordemAssinatura: '2' })];

      // Act
      const result = await collectAssinaturasDoAno({ rows, deputadoIds });

      // Assert
      expect(result.porProposicao.get(2642000)?.get(DEPUTADO_A)).toBe(false);
    });
  });
});

describe('applyProposicoesAno', () => {
  function accumulators(porProposicao: PorProposicao) {
    return {
      pendentes: porProposicao,
      buckets: new Map() as AssinaturaBuckets,
      tipos: new Map() as TipoRegistry,
    };
  }

  describe('when siglaTipo is DOC or OF', () => {
    it('discards the pair and does not bucket anything', async () => {
      // Arrange
      const porProposicao: PorProposicao = new Map([
        [2642000, new Map([[DEPUTADO_A, false]])],
      ]);
      const { pendentes, buckets, tipos } = accumulators(porProposicao);

      // Act
      const result = await applyProposicoesAno({
        rows: [proposicoesRow({ siglaTipo: 'DOC' })],
        sourceFile: 'proposicoes-2025.csv',
        pendentes,
        buckets,
        tipos,
      });

      // Assert
      expect(result.ignoredTipoExcluido).toBe(1);
      expect(buckets.size).toBe(0);
      expect(pendentes.has(2642000)).toBe(false);
    });
  });

  describe('when dataApresentacao falls in a different year than the source file', () => {
    it('buckets by the year of dataApresentacao, not the file year', async () => {
      // Arrange
      const porProposicao: PorProposicao = new Map([
        [2642000, new Map([[DEPUTADO_A, true]])],
      ]);
      const { pendentes, buckets, tipos } = accumulators(porProposicao);

      // Act
      await applyProposicoesAno({
        rows: [proposicoesRow({ dataApresentacao: '2024-12-30T10:00:00' })],
        sourceFile: 'proposicoes-2025.csv',
        pendentes,
        buckets,
        tipos,
      });

      // Assert
      expect(buckets.has(2024)).toBe(true);
      expect(buckets.has(2025)).toBe(false);
    });
  });

  describe('when ordemAssinatura = 1 feeds the second counter', () => {
    it('increments both assinadas and primeiras for the day and the tipo', async () => {
      // Arrange
      const porProposicao: PorProposicao = new Map([
        [2642000, new Map([[DEPUTADO_A, true]])],
      ]);
      const { pendentes, buckets, tipos } = accumulators(porProposicao);

      // Act
      await applyProposicoesAno({
        rows: [proposicoesRow()],
        sourceFile: 'proposicoes-2025.csv',
        pendentes,
        buckets,
        tipos,
      });

      // Assert
      const acumulador = buckets.get(2025)?.get(DEPUTADO_A);
      expect(acumulador?.dias.get('2025-02-11')).toEqual([1, 1]);
      expect(acumulador?.tipos.get('PL')).toEqual([1, 1]);
    });

    it('leaves primeiras at zero when nobody in the pair signed first', async () => {
      // Arrange
      const porProposicao: PorProposicao = new Map([
        [2642000, new Map([[DEPUTADO_A, false]])],
      ]);
      const { pendentes, buckets, tipos } = accumulators(porProposicao);

      // Act
      await applyProposicoesAno({
        rows: [proposicoesRow()],
        sourceFile: 'proposicoes-2025.csv',
        pendentes,
        buckets,
        tipos,
      });

      // Assert
      expect(
        buckets.get(2025)?.get(DEPUTADO_A)?.dias.get('2025-02-11'),
      ).toEqual([1, 0]);
    });
  });

  describe('when dataApresentacao is missing or malformed', () => {
    it('rejects the row and resolves the pendente without bucketing it', async () => {
      // Arrange
      const porProposicao: PorProposicao = new Map([
        [2642000, new Map([[DEPUTADO_A, false]])],
      ]);
      const { pendentes, buckets, tipos } = accumulators(porProposicao);

      // Act
      const result = await applyProposicoesAno({
        rows: [proposicoesRow({ dataApresentacao: '' })],
        sourceFile: 'proposicoes-2025.csv',
        pendentes,
        buckets,
        tipos,
      });

      // Assert
      expect(result.rejected).toHaveLength(1);
      expect(result.rejected[0]).toMatchObject({
        type: 'validacao_data_apresentacao_invalida',
        line: 2,
      });
      expect(pendentes.has(2642000)).toBe(false);
      expect(buckets.size).toBe(0);
    });
  });

  describe('when a proposicao id is not among the pendentes', () => {
    it('skips the row without touching buckets or tipos', async () => {
      // Arrange
      const { pendentes, buckets, tipos } = accumulators(new Map());

      // Act
      const result = await applyProposicoesAno({
        rows: [proposicoesRow({ id: '999999' })],
        sourceFile: 'proposicoes-2025.csv',
        pendentes,
        buckets,
        tipos,
      });

      // Assert
      expect(result.read).toBe(1);
      expect(buckets.size).toBe(0);
      expect(tipos.size).toBe(0);
    });
  });

  describe('when resolving a proposicao from a different year file', () => {
    it('registers the tipo and resolves the pendente, as the late-resolution pass does', async () => {
      // Arrange: a pendente carried over from 2025, resolved by proposicoes-2016.csv
      const porProposicao: PorProposicao = new Map([
        [1000, new Map([[DEPUTADO_B, false]])],
      ]);
      const { pendentes, buckets, tipos } = accumulators(porProposicao);

      // Act
      await applyProposicoesAno({
        rows: [
          proposicoesRow({
            id: '1000',
            siglaTipo: 'PL',
            dataApresentacao: '2025-06-01T09:00:00',
          }),
        ],
        sourceFile: 'proposicoes-2016.csv',
        pendentes,
        buckets,
        tipos,
      });

      // Assert
      expect(pendentes.has(1000)).toBe(false);
      expect(buckets.get(2025)?.get(DEPUTADO_B)).toBeDefined();
      expect(tipos.get('PL')).toEqual({
        descricaoTipo: 'Projeto de Lei',
        externalCodTipo: 139,
      });
    });
  });
});

describe('toDeputadoProposicaoAssinadaRows', () => {
  it('projects the accumulator into rows keyed by deputadoId', () => {
    // Arrange
    const porDeputado = new Map([
      [
        DEPUTADO_A,
        {
          dias: new Map([['2025-02-11', [1, 1] as const]]),
          tipos: new Map([['PL', [1, 1] as const]]),
        },
      ],
    ]);

    // Act
    const rows = toDeputadoProposicaoAssinadaRows(2025, porDeputado);

    // Assert
    expect(rows).toEqual([
      {
        deputadoId: DEPUTADO_A,
        year: 2025,
        assinaturasJson: { '2025-02-11': [1, 1] },
        composicaoJson: { PL: [1, 1] },
      },
    ]);
  });
});

describe('toProposicaoTipoRows', () => {
  it('projects the tipo registry into rows keyed by siglaTipo', () => {
    // Arrange
    const tipos: TipoRegistry = new Map([
      ['PL', { descricaoTipo: 'Projeto de Lei', externalCodTipo: 139 }],
    ]);

    // Act
    const rows = toProposicaoTipoRows(tipos);

    // Assert
    expect(rows).toEqual([
      {
        siglaTipo: 'PL',
        descricaoTipo: 'Projeto de Lei',
        externalCodTipo: 139,
      },
    ]);
  });
});
