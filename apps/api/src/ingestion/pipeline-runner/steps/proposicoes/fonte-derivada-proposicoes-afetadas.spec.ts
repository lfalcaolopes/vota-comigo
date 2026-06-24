import type { CsvRecord, CsvRow } from '../../sources/csv-reader';
import type { CsvRowSource } from '../../types/ingestion-pipeline-runner.types';
import type {
  DatasetDownloader,
  DatasetDownloadOptions,
} from '../../shared/dataset-downloader';
import { StrictModeError } from '../../errors/strict-mode-error';
import { createFonteDerivadaProposicoesAfetadas } from './fonte-derivada-proposicoes-afetadas';

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

function votacao(id: string, siglaOrgao = 'PLEN'): CsvRecord {
  return { id, siglaOrgao };
}

function link(idVotacao: string, id: string, ano: string): CsvRecord {
  return { idVotacao, proposicao_id: id, proposicao_ano: ano };
}

function proposicaoRecord(id: string, ano: string): CsvRecord {
  return { id, ano };
}

function temaRecord(id: string, codTema: string): CsvRecord {
  return {
    uriProposicao: `https://dadosabertos.camara.leg.br/api/v2/proposicoes/${id}`,
    codTema,
    tema: 'Administração Pública',
  };
}

type Datasets = Record<string, Record<number, readonly CsvRecord[]>>;

function readDatasetFrom(datasets: Datasets) {
  return (dataset: string, year: number): CsvRowSource | undefined => {
    const records = datasets[dataset]?.[year];
    return records === undefined ? undefined : source(records);
  };
}

function createFakeDownloader(
  behavior: (years: readonly number[]) => void = () => {},
): DatasetDownloader & {
  readonly calls: number[][];
  readonly optionsCalls: (DatasetDownloadOptions | undefined)[];
} {
  const calls: number[][] = [];
  const optionsCalls: (DatasetDownloadOptions | undefined)[] = [];
  return {
    calls,
    optionsCalls,
    async download(years, options) {
      calls.push([...years]);
      optionsCalls.push(options);
      behavior(years);
      return { ok: true };
    },
  };
}

function createFonte(
  proposicoesDownloader: DatasetDownloader = createFakeDownloader(),
  temasDownloader: DatasetDownloader = createFakeDownloader(),
) {
  return createFonteDerivadaProposicoesAfetadas({
    proposicoesDownloader,
    temasDownloader,
  });
}

function createReporter() {
  const lines: string[] = [];

  return {
    lines,
    log(message: string) {
      lines.push(message);
    },
  };
}

describe('fonte derivada de proposicoes afetadas', () => {
  describe('when preparing proposicoes', () => {
    it('derives needed proposicoes by year and emits the operational log', async () => {
      // Arrange
      const datasets: Datasets = {
        votacoesVotos: { 2024: [voto('2024-1'), voto('2024-2')] },
        votacoes: { 2024: [votacao('2024-1'), votacao('2024-2')] },
        votacoesProposicoes: {
          2024: [link('2024-1', '111', '2020'), link('2024-2', '222', '2021')],
        },
        proposicoes: {
          2020: [proposicaoRecord('111', '2020')],
        },
      };
      const reporter = createReporter();
      const fonte = createFonte();

      // Act
      const prepared = await fonte.prepareProposicoes({
        years: [2024],
        limit: 1,
        canDownload: false,
        strict: false,
        reporter,
        readDataset: readDatasetFrom(datasets),
      });

      // Assert
      expect(prepared.neededByYear.get(2020)).toEqual(new Set([111]));
      expect(prepared.neededByYear.has(2021)).toBe(false);
      expect(prepared.externalGaps).toEqual([]);
      expect(reporter.lines).toContain(
        '[proposicoes] 1 proposições necessárias em 1 ano(s)',
      );
    });

    it('excludes proposicoes reachable only through committee votacoes', async () => {
      // Arrange
      const datasets: Datasets = {
        votacoesVotos: { 2024: [voto('2024-1'), voto('2024-2')] },
        votacoes: {
          2024: [votacao('2024-1', 'PLEN'), votacao('2024-2', 'CCJC')],
        },
        votacoesProposicoes: {
          2024: [link('2024-1', '111', '2020'), link('2024-2', '222', '2021')],
        },
        proposicoes: {
          2020: [proposicaoRecord('111', '2020')],
        },
      };
      const fonte = createFonte();

      // Act
      const prepared = await fonte.prepareProposicoes({
        years: [2024],
        canDownload: false,
        strict: false,
        readDataset: readDatasetFrom(datasets),
      });

      // Assert
      expect(prepared.neededByYear.get(2020)).toEqual(new Set([111]));
      expect(prepared.neededByYear.has(2021)).toBe(false);
      expect(prepared.externalGaps).toEqual([]);
    });

    it('downloads missing yearly files when download is enabled', async () => {
      // Arrange
      const datasets: Datasets = {
        votacoesVotos: { 2024: [voto('2024-1')] },
        votacoes: { 2024: [votacao('2024-1')] },
        votacoesProposicoes: { 2024: [link('2024-1', '111', '2007')] },
        proposicoes: {},
      };
      const downloader = createFakeDownloader(() => {
        datasets.proposicoes[2007] = [proposicaoRecord('111', '2007')];
      });
      const fonte = createFonte(downloader);

      // Act
      const prepared = await fonte.prepareProposicoes({
        years: [2024],
        canDownload: true,
        strict: false,
        readDataset: readDatasetFrom(datasets),
      });

      // Assert
      expect(downloader.calls).toEqual([[2007]]);
      expect(prepared.externalGaps).toEqual([]);
    });

    it('forwards the reporter and proposicoes label to the downloader', async () => {
      // Arrange
      const datasets: Datasets = {
        votacoesVotos: { 2024: [voto('2024-1')] },
        votacoes: { 2024: [votacao('2024-1')] },
        votacoesProposicoes: { 2024: [link('2024-1', '111', '2007')] },
        proposicoes: {},
      };
      const reporter = createReporter();
      const downloader = createFakeDownloader(() => {
        datasets.proposicoes[2007] = [proposicaoRecord('111', '2007')];
      });
      const fonte = createFonte(downloader);

      // Act
      await fonte.prepareProposicoes({
        years: [2024],
        canDownload: true,
        strict: false,
        reporter,
        readDataset: readDatasetFrom(datasets),
      });

      // Assert
      expect(downloader.optionsCalls).toEqual([
        { reporter, label: '[proposicoes]' },
      ]);
    });

    it('aborts with a resume instruction when a required download fails', async () => {
      // Arrange
      const datasets: Datasets = {
        votacoesVotos: { 2024: [voto('2024-1')] },
        votacoes: { 2024: [votacao('2024-1')] },
        votacoesProposicoes: { 2024: [link('2024-1', '111', '2007')] },
        proposicoes: {},
      };
      const failing: DatasetDownloader = {
        async download() {
          return { ok: false, failures: [{ year: 2007, reason: 'HTTP 503' }] };
        },
      };
      const fonte = createFonte(failing);

      // Act / Assert
      await expect(
        fonte.prepareProposicoes({
          years: [2024],
          canDownload: true,
          strict: false,
          readDataset: readDatasetFrom(datasets),
        }),
      ).rejects.toThrow(/only=proposicoes,votacao_proposicao/);
    });

    it('reports a missing source file without downloading when download is disabled', async () => {
      // Arrange
      const datasets: Datasets = {
        votacoesVotos: { 2024: [voto('2024-1')] },
        votacoes: { 2024: [votacao('2024-1')] },
        votacoesProposicoes: { 2024: [link('2024-1', '111', '2007')] },
        proposicoes: {},
      };
      const downloader = createFakeDownloader();
      const fonte = createFonte(downloader);

      // Act
      const prepared = await fonte.prepareProposicoes({
        years: [2024],
        canDownload: false,
        strict: true,
        readDataset: readDatasetFrom(datasets),
      });

      // Assert
      expect(downloader.calls).toEqual([]);
      expect(prepared.externalGaps).toEqual([
        expect.objectContaining({
          type: 'fonte_ausente',
          reference: 'proposicoes-2007',
        }),
      ]);
    });

    it('reports a missing proposicao in default mode', async () => {
      // Arrange
      const datasets: Datasets = {
        votacoesVotos: { 2024: [voto('2024-1')] },
        votacoes: { 2024: [votacao('2024-1')] },
        votacoesProposicoes: { 2024: [link('2024-1', '222', '2020')] },
        proposicoes: { 2020: [proposicaoRecord('111', '2020')] },
      };
      const fonte = createFonte();

      // Act
      const prepared = await fonte.prepareProposicoes({
        years: [2024],
        canDownload: true,
        strict: false,
        readDataset: readDatasetFrom(datasets),
      });

      // Assert
      expect(prepared.externalGaps).toEqual([
        expect.objectContaining({
          type: 'proposicao_ausente',
          reference: '222',
        }),
      ]);
    });

    it('aborts in strict mode when a needed proposicao is missing', async () => {
      // Arrange
      const datasets: Datasets = {
        votacoesVotos: { 2024: [voto('2024-1')] },
        votacoes: { 2024: [votacao('2024-1')] },
        votacoesProposicoes: { 2024: [link('2024-1', '222', '2020')] },
        proposicoes: { 2020: [proposicaoRecord('111', '2020')] },
      };
      const fonte = createFonte();

      // Act / Assert
      await expect(
        fonte.prepareProposicoes({
          years: [2024],
          canDownload: true,
          strict: true,
          readDataset: readDatasetFrom(datasets),
        }),
      ).rejects.toBeInstanceOf(StrictModeError);
    });

    it('does not abort missing proposicoes when download is disabled', async () => {
      // Arrange
      const datasets: Datasets = {
        votacoesVotos: { 2024: [voto('2024-1')] },
        votacoes: { 2024: [votacao('2024-1')] },
        votacoesProposicoes: { 2024: [link('2024-1', '222', '2020')] },
        proposicoes: { 2020: [proposicaoRecord('111', '2020')] },
      };
      const fonte = createFonte();

      // Act
      const prepared = await fonte.prepareProposicoes({
        years: [2024],
        canDownload: false,
        strict: true,
        readDataset: readDatasetFrom(datasets),
      });

      // Assert
      expect(prepared.externalGaps).toEqual([
        expect.objectContaining({
          type: 'proposicao_ausente',
          reference: '222',
        }),
      ]);
    });
  });

  describe('when preparing temas', () => {
    it('downloads missing theme files and emits the operational log', async () => {
      // Arrange
      const datasets: Datasets = {
        votacoesVotos: { 2024: [voto('2024-1')] },
        votacoes: { 2024: [votacao('2024-1')] },
        votacoesProposicoes: { 2024: [link('2024-1', '111', '2020')] },
        proposicoesTemas: {},
      };
      const reporter = createReporter();
      const downloader = createFakeDownloader(() => {
        datasets.proposicoesTemas[2020] = [temaRecord('111', '34')];
      });
      const fonte = createFonte(createFakeDownloader(), downloader);

      // Act
      const prepared = await fonte.prepareTemas({
        years: [2024],
        canDownload: true,
        strict: true,
        reporter,
        readDataset: readDatasetFrom(datasets),
      });

      // Assert
      expect(downloader.calls).toEqual([[2020]]);
      expect(prepared.externalGaps).toEqual([]);
      expect(reporter.lines).toEqual([
        '[tema] temas necessários para proposições de 1 ano(s)',
        '[tema] baixando proposicoesTemas-{ano}.csv ausentes: 2020',
      ]);
    });

    it('reports a missing theme file without creating proposicao gaps', async () => {
      // Arrange
      const datasets: Datasets = {
        votacoesVotos: { 2024: [voto('2024-1')] },
        votacoes: { 2024: [votacao('2024-1')] },
        votacoesProposicoes: { 2024: [link('2024-1', '111', '2020')] },
        proposicoesTemas: {},
      };
      const fonte = createFonte();

      // Act
      const prepared = await fonte.prepareTemas({
        years: [2024],
        canDownload: false,
        strict: true,
        readDataset: readDatasetFrom(datasets),
      });

      // Assert
      expect(prepared.externalGaps).toEqual([
        expect.objectContaining({
          type: 'fonte_ausente',
          reference: 'proposicoesTemas-2020',
        }),
      ]);
    });

    it('does not create gaps when an ingested proposicao has no theme row', async () => {
      // Arrange
      const datasets: Datasets = {
        votacoesVotos: { 2024: [voto('2024-1')] },
        votacoes: { 2024: [votacao('2024-1')] },
        votacoesProposicoes: { 2024: [link('2024-1', '111', '2020')] },
        proposicoesTemas: { 2020: [] },
      };
      const fonte = createFonte();

      // Act
      const prepared = await fonte.prepareTemas({
        years: [2024],
        canDownload: true,
        strict: true,
        readDataset: readDatasetFrom(datasets),
      });

      // Assert
      expect(prepared.externalGaps).toEqual([]);
    });
  });
});
