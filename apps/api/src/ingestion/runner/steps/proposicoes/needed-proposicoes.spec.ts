import { collectNeededProposicoes } from './needed-proposicoes';
import type { CsvRecord, CsvRow } from '../../csv-reader';
import type { CsvRowSource } from '../../ingestion-runner.types';

async function* rows(items: readonly CsvRecord[]): AsyncIterable<CsvRow> {
  let lineNumber = 1;
  for (const record of items) {
    lineNumber += 1;
    yield { lineNumber, record };
  }
}

function source(items: readonly CsvRecord[]): CsvRowSource {
  return () => rows(items);
}

function voto(idVotacao: string): CsvRecord {
  return {
    idVotacao,
    deputado_uri: 'https://dadosabertos.camara.leg.br/api/v2/deputados/1',
  };
}

function link(
  idVotacao: string,
  proposicaoId: string,
  proposicaoAno: string,
): CsvRecord {
  return {
    idVotacao,
    proposicao_id: proposicaoId,
    proposicao_ano: proposicaoAno,
  };
}

type Datasets = Record<string, Record<number, readonly CsvRecord[]>>;

function readDatasetFrom(datasets: Datasets) {
  return (dataset: string, year: number): CsvRowSource | undefined => {
    const records = datasets[dataset]?.[year];
    return records === undefined ? undefined : source(records);
  };
}

describe('needed proposicoes set', () => {
  describe('when deriving from nominal votacoes in scope', () => {
    it('groups affected proposicao ids by their own year across scope years', async () => {
      // Arrange
      const datasets: Datasets = {
        votacoesVotos: {
          2024: [voto('2024-1'), voto('2024-2')],
          2025: [voto('2025-1')],
        },
        votacoesProposicoes: {
          2024: [
            link('2024-1', '1006391', '2015'),
            link('2024-1', '700000', '2007'),
            link('2024-2', '900000', '2024'),
            link('9999-9', '111111', '2024'),
          ],
          2025: [link('2025-1', '800000', '2007')],
        },
      };

      // Act
      const { neededByYear } = await collectNeededProposicoes({
        years: [2024, 2025],
        readDataset: readDatasetFrom(datasets),
      });

      // Assert
      expect(neededByYear.get(2015)).toEqual(new Set([1006391]));
      expect(neededByYear.get(2007)).toEqual(new Set([700000, 800000]));
      expect(neededByYear.get(2024)).toEqual(new Set([900000]));
      expect([...neededByYear.keys()].sort()).toEqual([2007, 2015, 2024]);
    });
  });

  describe('when a record is not linked to a nominal votacao', () => {
    it('ignores proposicoes whose votacao is absent from the nominal index', async () => {
      // Arrange
      const datasets: Datasets = {
        votacoesVotos: { 2024: [voto('2024-1')] },
        votacoesProposicoes: {
          2024: [link('9999-9', '111111', '2024')],
        },
      };

      // Act
      const { neededByYear } = await collectNeededProposicoes({
        years: [2024],
        readDataset: readDatasetFrom(datasets),
      });

      // Assert
      expect(neededByYear.size).toBe(0);
    });
  });

  describe('when limit caps the nominal votacoes considered', () => {
    it('only derives proposicoes for the first limit votacoes', async () => {
      // Arrange
      const datasets: Datasets = {
        votacoesVotos: { 2024: [voto('2024-1'), voto('2024-2')] },
        votacoesProposicoes: {
          2024: [link('2024-1', '111', '2020'), link('2024-2', '222', '2021')],
        },
      };

      // Act
      const { neededByYear } = await collectNeededProposicoes({
        years: [2024],
        limit: 1,
        readDataset: readDatasetFrom(datasets),
      });

      // Assert
      expect(neededByYear.get(2020)).toEqual(new Set([111]));
      expect(neededByYear.has(2021)).toBe(false);
    });
  });
});
