import { executeProposicaoResumoIaImport } from '../proposicao-resumo-ia-import';
import type {
  ProposicaoResumoIaRepository,
  ProposicaoResumoIaUpsertResult,
} from '../proposicao-resumo-ia.repository.types';

function item(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    sourceHash: 'source-hash',
    generationStatus: 'generated',
    reviewStatus: 'approved',
    resumoCard: 'Resumo curto.',
    resumoDetalhe: 'Resumo detalhado.',
    ...overrides,
  };
}

function fakeRepository(
  resolved: ReadonlyMap<number, string>,
  upsertResults: readonly ProposicaoResumoIaUpsertResult[],
): ProposicaoResumoIaRepository & {
  upserted: Parameters<ProposicaoResumoIaRepository['upsert']>[0][];
} {
  const upserted: Parameters<ProposicaoResumoIaRepository['upsert']>[0][] = [];
  return {
    upserted,
    async resolveProposicaoIds(externalIds) {
      return new Map(
        externalIds.flatMap((externalId) => {
          const proposicaoId = resolved.get(externalId);
          return proposicaoId === undefined ? [] : [[externalId, proposicaoId]];
        }),
      );
    },
    async upsert(rows) {
      upserted.push(rows);
      return (
        upsertResults[upserted.length - 1] ?? {
          inserted: rows.length,
          updated: 0,
        }
      );
    },
  };
}

describe('executeProposicaoResumoIaImport', () => {
  describe('when multiple annual JSON files are provided', () => {
    it('imports each file and logs an aggregated operational report', async () => {
      // Arrange
      const repository = fakeRepository(
        new Map([
          [42, 'proposicao-42'],
          [43, 'proposicao-43'],
          [44, 'proposicao-44'],
        ]),
        [
          { inserted: 1, updated: 1 },
          { inserted: 1, updated: 0 },
        ],
      );
      const files = new Map([
        [
          'resumos-2024.json',
          JSON.stringify({
            ano: 2024,
            items: {
              '42': item({ sourceHash: 'hash-42' }),
              '43': item({ sourceHash: 'hash-43' }),
            },
          }),
        ],
        [
          'resumos-2025.json',
          JSON.stringify({
            ano: 2025,
            items: {
              '44': item({ sourceHash: 'hash-44' }),
            },
          }),
        ],
      ]);
      const logs: string[] = [];

      // Act
      const result = await executeProposicaoResumoIaImport(
        ['resumos-2024.json', 'resumos-2025.json'],
        {
          repository,
          async readFile(path) {
            const content = files.get(path);
            if (content === undefined) {
              throw new Error(`missing fixture ${path}`);
            }
            return content;
          },
          reporter: { log: (message) => logs.push(message) },
        },
      );

      // Assert
      expect(result).toEqual({
        ok: true,
        exitCode: 0,
        message: 'Importação de resumos concluída.',
      });
      expect(repository.upserted).toHaveLength(2);
      expect(repository.upserted.map((rows) => rows.length)).toEqual([2, 1]);
      expect(logs).toEqual([
        'Arquivos lidos: 2',
        'Itens válidos: 3',
        'Resumos importados: 3',
        'Inseridos: 2',
        'Atualizados: 1',
        'Ignorados: 0',
      ]);
    });
  });

  describe('when an annual JSON file is invalid', () => {
    it('returns a failure without upserting rows from that file', async () => {
      // Arrange
      const repository = fakeRepository(new Map([[42, 'proposicao-42']]), [
        { inserted: 1, updated: 0 },
      ]);
      const logs: string[] = [];

      // Act
      const result = await executeProposicaoResumoIaImport(
        ['resumos-2024.json'],
        {
          repository,
          async readFile() {
            return JSON.stringify({
              ano: 2024,
              items: {
                '42': item({ resumoCard: 'x'.repeat(181) }),
              },
            });
          },
          reporter: { log: (message) => logs.push(message) },
        },
      );

      // Assert
      expect(result).toEqual({
        ok: false,
        exitCode: 1,
        message: 'JSON anual inválido em resumos-2024.json.',
      });
      expect(repository.upserted).toEqual([]);
      expect(logs).toEqual([]);
    });
  });
});
