import type { CsvRow } from '../../sources/csv-reader';

import { aggregateDeputadoGastoCota } from './deputado-gasto-cota.transformer';

type GastoCotaRecordOverrides = Partial<Record<string, string>>;

function line(
  lineNumber: number,
  overrides: GastoCotaRecordOverrides = {},
): CsvRow {
  return {
    lineNumber,
    record: {
      ideCadastro: '204379',
      numSubCota: '1',
      txtDescricao: 'MANUTENÇÃO DE ESCRITÓRIO DE APOIO À ATIVIDADE PARLAMENTAR',
      vlrLiquido: '100.00',
      vlrRestituicao: '',
      numMes: '3',
      numAno: '2024',
      sgUF: 'MG',
      ...overrides,
    },
  };
}

const deputadoIds = new Map([
  [204379, 'deputado-uuid'],
  [204380, 'outro-deputado-uuid'],
]);

describe('agregacao dos gastos da cota', () => {
  describe('when several records share deputado, month and categoria', () => {
    it('sums them into a single aggregate in cents', async () => {
      // Arrange
      const rows = [
        line(2),
        line(3, { vlrLiquido: '250.50' }),
        line(4, { vlrLiquido: '100.00', vlrRestituicao: '50.50' }),
      ];

      // Act
      const result = await aggregateDeputadoGastoCota({
        rows,
        sourceFile: 'Ano-2024.csv',
        year: 2024,
        deputadoIds,
      });

      // Assert
      expect(result.rows).toEqual([
        {
          deputadoId: 'deputado-uuid',
          year: 2024,
          month: 3,
          siglaUf: 'MG',
          externalNumSubCota: 1,
          descricao:
            'MANUTENÇÃO DE ESCRITÓRIO DE APOIO À ATIVIDADE PARLAMENTAR',
          valorUtilizadoCentavos: 40000,
        },
      ]);
      expect(result).toMatchObject({ ignored: 0, rejected: [] });
    });
  });

  describe('when the record belongs to a lideranca', () => {
    it('ignores it without reporting a gap to investigate', async () => {
      // Arrange
      const rows = [line(2, { ideCadastro: '' }), line(3)];

      // Act
      const result = await aggregateDeputadoGastoCota({
        rows,
        sourceFile: 'Ano-2024.csv',
        year: 2024,
        deputadoIds,
      });

      // Assert
      expect(result).toMatchObject({ ignored: 1, externalGaps: [] });
      expect(result.rows).toHaveLength(1);
    });
  });

  describe('when the record contradicts the file it came from', () => {
    it.each([
      ['numAno', { numAno: '2023' }],
      ['numMes', { numMes: '0' }],
      ['numMes', { numMes: '13' }],
      ['numSubCota', { numSubCota: '' }],
      ['vlrLiquido', { vlrLiquido: '1,50' }],
    ])('rejects it when %s is invalid', async (_field, overrides) => {
      // Arrange
      const rows = [line(7, overrides)];

      // Act
      const result = await aggregateDeputadoGastoCota({
        rows,
        sourceFile: 'Ano-2024.csv',
        year: 2024,
        deputadoIds,
      });

      // Assert
      expect(result.rows).toEqual([]);
      expect(result.rejected).toMatchObject([
        { file: 'Ano-2024.csv', line: 7, fields: overrides },
      ]);
    });
  });

  describe('when the ideCadastro has no deputado in the product', () => {
    it('records an external gap instead of dropping the record silently', async () => {
      // Arrange
      const rows = [line(2, { ideCadastro: '999999' })];

      // Act
      const result = await aggregateDeputadoGastoCota({
        rows,
        sourceFile: 'Ano-2024.csv',
        year: 2024,
        deputadoIds,
      });

      // Assert
      expect(result.rows).toEqual([]);
      expect(result.externalGaps).toEqual([
        {
          file: 'Ano-2024.csv',
          type: 'deputado_externo_desconhecido',
          reference: '999999',
          message:
            'Deputado externo 999999 não encontrado para os gastos da cota de 2024.',
        },
      ]);
    });

    it('reports one gap per unknown deputado, not per record', async () => {
      // Arrange
      const rows = [
        line(2, { ideCadastro: '999999' }),
        line(3, { ideCadastro: '999999', numMes: '4' }),
      ];

      // Act
      const result = await aggregateDeputadoGastoCota({
        rows,
        sourceFile: 'Ano-2024.csv',
        year: 2024,
        deputadoIds,
      });

      // Assert
      expect(result.externalGaps).toHaveLength(1);
    });
  });
});

describe('cobertura do dado da cota', () => {
  describe('when deputados stop spending in different months', () => {
    it('derives the covered month from the whole file, not per deputado', async () => {
      // Arrange
      const rows = [
        line(2, { numMes: '1' }),
        line(3, { numMes: '3' }),
        line(4, { ideCadastro: '204380', numMes: '5' }),
      ];

      // Act
      const result = await aggregateDeputadoGastoCota({
        rows,
        sourceFile: 'Ano-2024.csv',
        year: 2024,
        deputadoIds,
      });

      // Assert
      expect(result.coveredThroughMonth).toBe(5);
    });
  });

  describe('when a month in the middle of the year has no records', () => {
    it('keeps the coverage at the highest month present', async () => {
      // Arrange
      const rows = [
        line(2, { numMes: '1' }),
        line(3, { numMes: '4' }),
        line(4, { numMes: '2' }),
      ];

      // Act
      const result = await aggregateDeputadoGastoCota({
        rows,
        sourceFile: 'Ano-2024.csv',
        year: 2024,
        deputadoIds,
      });

      // Assert
      expect(result.coveredThroughMonth).toBe(4);
      expect(result.rows.map((row) => row.month)).toEqual([1, 4, 2]);
    });
  });

  describe('when the file has no usable record', () => {
    it('reports no coverage instead of month zero', async () => {
      // Arrange
      const rows = [line(2, { ideCadastro: '' })];

      // Act
      const result = await aggregateDeputadoGastoCota({
        rows,
        sourceFile: 'Ano-2024.csv',
        year: 2024,
        deputadoIds,
      });

      // Assert
      expect(result.coveredThroughMonth).toBeNull();
    });
  });
});

describe('relacao entre codigo e descricao da categoria', () => {
  describe('when the same numSubCota carries conflicting descriptions', () => {
    it('fails the whole load instead of picking one description', async () => {
      // Arrange
      const rows = [
        line(2, { numSubCota: '9', txtDescricao: 'PASSAGEM AÉREA' }),
        line(3, { numSubCota: '9', txtDescricao: 'OUTRA COISA' }),
      ];

      // Act
      const result = await aggregateDeputadoGastoCota({
        rows,
        sourceFile: 'Ano-2024.csv',
        year: 2024,
        deputadoIds,
      });

      // Assert
      expect(result.fatal).toMatchObject({
        file: 'Ano-2024.csv',
        line: 3,
        type: 'descricao_conflitante',
        fields: {
          numSubCota: '9',
          txtDescricao: 'OUTRA COISA',
        },
      });
    });
  });

  describe('when the file brings a numSubCota the product has never seen', () => {
    it('aggregates it like any other categoria', async () => {
      // Arrange
      const rows = [
        line(2, { numSubCota: '999', txtDescricao: 'CATEGORIA NOVA' }),
      ];

      // Act
      const result = await aggregateDeputadoGastoCota({
        rows,
        sourceFile: 'Ano-2024.csv',
        year: 2024,
        deputadoIds,
      });

      // Assert
      expect(result.fatal).toBeNull();
      expect(result.rows).toMatchObject([
        { externalNumSubCota: 999, descricao: 'CATEGORIA NOVA' },
      ]);
    });
  });
});

describe('estado do deputado no ano', () => {
  describe('when the same deputado appears under conflicting sgUF', () => {
    it('fails the whole load instead of picking one estado', async () => {
      // Arrange
      const rows = [line(2, { sgUF: 'MG' }), line(3, { sgUF: 'BA' })];

      // Act
      const result = await aggregateDeputadoGastoCota({
        rows,
        sourceFile: 'Ano-2024.csv',
        year: 2024,
        deputadoIds,
      });

      // Assert
      expect(result.fatal).toMatchObject({
        file: 'Ano-2024.csv',
        line: 3,
        type: 'uf_conflitante',
        fields: { ideCadastro: '204379', sgUF: 'BA', siglaUfAnterior: 'MG' },
      });
    });
  });

  describe('when two deputados come from different estados', () => {
    it('keeps each estado on its own aggregates', async () => {
      // Arrange
      const rows = [
        line(2, { sgUF: 'MG' }),
        line(3, { ideCadastro: '204380', sgUF: 'BA' }),
      ];

      // Act
      const result = await aggregateDeputadoGastoCota({
        rows,
        sourceFile: 'Ano-2024.csv',
        year: 2024,
        deputadoIds,
      });

      // Assert
      expect(result.fatal).toBeNull();
      expect(result.rows).toMatchObject([
        { deputadoId: 'deputado-uuid', siglaUf: 'MG' },
        { deputadoId: 'outro-deputado-uuid', siglaUf: 'BA' },
      ]);
    });
  });
});

describe('conferencia da agregacao', () => {
  describe('when records are accepted, rejected and ignored in the same file', () => {
    it('checksums only what the aggregates should account for', async () => {
      // Arrange
      const rows = [
        line(2, { vlrLiquido: '100.00' }),
        line(3, { vlrLiquido: '-30.00' }),
        line(4, { ideCadastro: '' }),
        line(5, { numMes: '0' }),
        line(6, { ideCadastro: '999999' }),
      ];

      // Act
      const result = await aggregateDeputadoGastoCota({
        rows,
        sourceFile: 'Ano-2024.csv',
        year: 2024,
        deputadoIds,
      });

      // Assert
      expect(result.totalValorUtilizadoCentavos).toBe(7000);
      expect(result.read).toBe(5);
    });
  });

  describe('when the same file is processed twice', () => {
    it('produces identical aggregates', async () => {
      // Arrange
      const rows = [
        line(2, { numMes: '2', vlrLiquido: '10.10' }),
        line(3, { numSubCota: '4', txtDescricao: 'PASSAGEM AÉREA' }),
        line(4, { ideCadastro: '204380', vlrLiquido: '-5.00' }),
      ];

      // Act
      const first = await aggregateDeputadoGastoCota({
        rows,
        sourceFile: 'Ano-2024.csv',
        year: 2024,
        deputadoIds,
      });
      const second = await aggregateDeputadoGastoCota({
        rows,
        sourceFile: 'Ano-2024.csv',
        year: 2024,
        deputadoIds,
      });

      // Assert
      expect(second).toEqual(first);
    });
  });
});

describe('categorias vistas no arquivo', () => {
  describe('when the file uses several categoria codes', () => {
    it('reports each code once with the description the source gave it', async () => {
      // Arrange
      const rows = [
        line(2, { numSubCota: '1', txtDescricao: 'MANUTENÇÃO DE ESCRITÓRIO' }),
        line(3, { numSubCota: '9', txtDescricao: 'PASSAGEM AÉREA' }),
        line(4, { numSubCota: '1', txtDescricao: 'MANUTENÇÃO DE ESCRITÓRIO' }),
      ];

      // Act
      const result = await aggregateDeputadoGastoCota({
        rows,
        sourceFile: 'Ano-2024.csv',
        year: 2024,
        deputadoIds,
      });

      // Assert
      expect(result.categorias).toEqual([
        { externalNumSubCota: 1, descricao: 'MANUTENÇÃO DE ESCRITÓRIO' },
        { externalNumSubCota: 9, descricao: 'PASSAGEM AÉREA' },
      ]);
    });
  });
});
