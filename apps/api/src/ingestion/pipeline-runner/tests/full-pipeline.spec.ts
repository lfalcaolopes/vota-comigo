import { Readable } from 'node:stream';

import { executeIngestionPipelineRunner } from '../ingestion-pipeline-runner';
import { readCsvRecords } from '../sources/csv-reader';
import { createLegislaturasStep } from '../steps/legislaturas/legislaturas.step';
import { createDeputadosStep } from '../steps/deputados/deputados.step';
import { createPartidosStep } from '../steps/partidos/partidos.step';
import { createVotacoesStep } from '../steps/votacoes/votacoes.step';
import { createVotacaoVotosStep } from '../steps/votacao-votos/votacao-votos.step';
import { createProposicoesStep } from '../steps/proposicoes/proposicoes.step';
import { createFonteDerivadaProposicoesAfetadas } from '../steps/proposicoes/fonte-derivada-proposicoes-afetadas';
import { createVotacaoProposicaoStep } from '../steps/votacao-proposicao/votacao-proposicao.step';
import { createTemaStep } from '../steps/tema/tema.step';
import { createSanityStep } from '../steps/sanity/sanity.step';
import type { DatasetDownloader } from '../shared/dataset-downloader';
import type { LegislaturaRepository } from '../steps/legislaturas/legislaturas.repository.types';
import type { DeputadoRepository } from '../steps/deputados/deputados.repository.types';
import type { PartidoRepository } from '../steps/partidos/partidos.repository.types';
import type { VotacaoRepository } from '../steps/votacoes/votacoes.repository.types';
import type {
  DeputadoLookup,
  VotacaoVotosRepository,
  VotacaoVotosRow,
} from '../steps/votacao-votos/votacao-votos.repository.types';
import type { ProposicaoRepository } from '../steps/proposicoes/proposicoes.repository.types';
import type {
  ProposicaoLookup,
  VotacaoLookup,
  VotacaoProposicaoRepository,
} from '../steps/votacao-proposicao/votacao-proposicao.repository.types';
import type {
  TemaLookup,
  TemaRepository,
} from '../steps/tema/tema.repository.types';
import type { SanityRepository } from '../steps/sanity/sanity.repository.types';
import type {
  IngestionReporter,
  IngestionStep,
} from '../types/ingestion-pipeline-runner.types';

const DEP_A = 'https://dadosabertos.camara.leg.br/api/v2/deputados/204554';
const DEP_B = 'https://dadosabertos.camara.leg.br/api/v2/deputados/178957';
const PARTIDO = 'https://dadosabertos.camara.leg.br/api/v2/partidos/36769';

const legislaturasCsv = [
  'idLegislatura;uri;dataInicio;dataFim;anoEleicao',
  '57;https://example/57;2023-02-01;2027-01-31;2022',
  '56;https://example/56;2019-02-01;2023-01-31;2018',
].join('\n');

const deputadosCsv = [
  'uri;nome;nomeCivil;siglaSexo;dataNascimento;dataFalecimento;ufNascimento;municipioNascimento;urlRedeSocial;urlWebsite;idLegislaturaInicial;idLegislaturaFinal',
  `${DEP_A};Dep A;A Civil;M;1980-01-01;;SP;São Paulo;;;56;57`,
  `${DEP_B};Dep B;B Civil;F;1975-01-01;;RJ;Rio;;;56;57`,
].join('\n');

// 2024-1: sim/não (placar bate); 2024-2: sim/sim (placar oficial divergente);
// 2024-3: votos em branco na fonte (placar oficial existe, direções ausentes).
const votacoesVotosCsv = [
  'idVotacao;uriVotacao;dataHoraVoto;voto;deputado_uri;deputado_nome;deputado_siglaUf;deputado_idLegislatura;deputado_urlFoto;deputado_uriPartido',
  `2024-1;u;2024-03-01T10:00;Sim;${DEP_A};Dep A;SP;57;;${PARTIDO}`,
  `2024-1;u;2024-03-01T10:00;Não;${DEP_B};Dep B;RJ;57;;${PARTIDO}`,
  `2024-2;u;2024-03-02T10:00;Sim;${DEP_A};Dep A;SP;57;;${PARTIDO}`,
  `2024-2;u;2024-03-02T10:00;Sim;${DEP_B};Dep B;RJ;57;;${PARTIDO}`,
  `2024-3;u;2024-03-03T10:00;;${DEP_A};Dep A;SP;57;;${PARTIDO}`,
  `2024-3;u;2024-03-03T10:00;;${DEP_B};Dep B;RJ;57;;${PARTIDO}`,
].join('\n');

const votacoesCsv = [
  'id;uri;data;dataHoraRegistro;idOrgao;siglaOrgao;idEvento;aprovacao;votosSim;votosNao;votosOutros;descricao',
  '2024-1;u;2024-03-01;2024-03-01T10:00;180;PLEN;100;1;1;1;0;Votação 1',
  '2024-2;u;2024-03-02;2024-03-02T10:00;180;PLEN;101;1;3;0;0;Votação 2',
  '2024-3;u;2024-03-03;2024-03-03T10:00;180;PLEN;102;1;5;0;0;Votação 3',
].join('\n');

const votacoesProposicoesCsv = [
  'idVotacao;proposicao_id;proposicao_ano;proposicao_siglaTipo;proposicao_codTipo;proposicao_numero;proposicao_titulo;proposicao_ementa',
  '2024-1;100;2023;PL;139;1000;PL 1000/2023;Ementa 100',
  '2024-2;101;2023;PL;139;1001;PL 1001/2023;Ementa 101',
].join('\n');

const proposicoesCsv = [
  'id;uri;siglaTipo;numero;ano;codTipo;descricaoTipo;ementa;ementaDetalhada;keywords;dataApresentacao;urlInteiroTeor;ultimoStatus_dataHora;ultimoStatus_siglaOrgao;ultimoStatus_regime;ultimoStatus_descricaoSituacao',
  '100;https://x/proposicoes/100;PL;1000;2023;139;Projeto de Lei;Ementa 100;;;2023-05-01;;;;;',
  '101;https://x/proposicoes/101;PL;1001;2023;139;Projeto de Lei;Ementa 101;;;2023-05-02;;;;;',
].join('\n');

const proposicoesTemasCsv = [
  'uriProposicao;codTema;tema;relevancia',
  'https://x/proposicoes/100;34;Economia;0',
  'https://x/proposicoes/101;34;Economia;0',
].join('\n');

function routeCsv(path: string): string {
  if (path.includes('legislaturas')) return legislaturasCsv;
  if (path.includes('deputados')) return deputadosCsv;
  if (path.includes('votacoesVotos')) return votacoesVotosCsv;
  if (path.includes('votacoesProposicoes')) return votacoesProposicoesCsv;
  if (path.includes('proposicoesTemas')) return proposicoesTemasCsv;
  if (path.includes('proposicoes')) return proposicoesCsv;
  if (path.includes('votacoes')) return votacoesCsv;
  throw new Error(`Fonte inesperada no teste: ${path}`);
}

type Store = {
  writes: number;
  legislatura: Map<number, string>;
  deputado: Map<number, string>;
  partido: Map<number, string>;
  votacao: Map<
    string,
    { id: string; votosSim: number | null; votosNao: number | null }
  >;
  votacaoVotos: Map<string, VotacaoVotosRow>;
  proposicao: Map<number, string>;
  tema: Map<number, string>;
  vinculo: Set<string>;
};

function createStore(): Store {
  return {
    writes: 0,
    legislatura: new Map(),
    deputado: new Map(),
    partido: new Map(),
    votacao: new Map(),
    votacaoVotos: new Map(),
    proposicao: new Map(),
    tema: new Map(),
    vinculo: new Set(),
  };
}

function upsertById<K>(
  store: Store,
  map: Map<K, string>,
  prefix: string,
  keys: readonly K[],
): { inserted: number; updated: number } {
  let inserted = 0;
  let updated = 0;

  for (const key of keys) {
    store.writes += 1;
    if (map.has(key)) {
      updated += 1;
    } else {
      map.set(key, `${prefix}-${String(key)}`);
      inserted += 1;
    }
  }

  return { inserted, updated };
}

const downloader: DatasetDownloader = {
  async download() {
    return { ok: true };
  },
};

const historicoStep: IngestionStep = {
  name: 'deputado_historico',
  scope: 'single',
  source: 'api',
  async run() {
    return {
      read: 0,
      inserted: 0,
      updated: 0,
      ignored: 0,
      rejected: [],
      externalGaps: [],
    };
  },
};

function buildSteps(store: Store): readonly IngestionStep[] {
  const legislaturaRepository: LegislaturaRepository = {
    async upsert(rows) {
      return upsertById(
        store,
        store.legislatura,
        'leg',
        rows.map((row) => row.externalIdLegislatura),
      );
    },
  };

  const legislaturaLookup = {
    async loadIdByExternalId(): Promise<ReadonlyMap<number, string>> {
      return new Map(store.legislatura);
    },
  };

  const deputadoRepository: DeputadoRepository = {
    async upsert(rows) {
      return upsertById(
        store,
        store.deputado,
        'dep',
        rows.map((row) => row.externalIdDeputado),
      );
    },
  };

  const partidoRepository: PartidoRepository = {
    async upsert(rows) {
      return upsertById(
        store,
        store.partido,
        'par',
        rows.map((row) => row.externalIdPartido),
      );
    },
  };

  const votacaoRepository: VotacaoRepository = {
    async upsert(rows) {
      let inserted = 0;
      let updated = 0;

      for (const row of rows) {
        store.writes += 1;
        const existing = store.votacao.get(row.externalIdVotacao);
        const value = {
          id: existing?.id ?? `vot-${row.externalIdVotacao}`,
          votosSim: row.votosSim,
          votosNao: row.votosNao,
        };
        store.votacao.set(row.externalIdVotacao, value);
        if (existing === undefined) {
          inserted += 1;
        } else {
          updated += 1;
        }
      }

      return { inserted, updated };
    },
  };

  const votacaoLookup: VotacaoLookup = {
    async loadIdByExternalId(): Promise<ReadonlyMap<string, string>> {
      return new Map(
        [...store.votacao].map(([externalId, value]) => [externalId, value.id]),
      );
    },
  };

  const deputadoLookup: DeputadoLookup = {
    async loadIdByExternalId(): Promise<ReadonlyMap<number, string>> {
      return new Map(store.deputado);
    },
  };

  const votacaoVotosRepository: VotacaoVotosRepository = {
    async upsert(rows) {
      let inserted = 0;
      let updated = 0;

      for (const row of rows) {
        store.writes += 1;
        if (store.votacaoVotos.has(row.externalIdVotacao)) {
          updated += 1;
        } else {
          inserted += 1;
        }
        store.votacaoVotos.set(row.externalIdVotacao, row);
      }

      return { inserted, updated };
    },
  };

  const proposicaoRepository: ProposicaoRepository = {
    async upsert(rows) {
      return upsertById(
        store,
        store.proposicao,
        'prop',
        rows.map((row) => row.externalIdProposicao),
      );
    },
  };

  const proposicaoLookup: ProposicaoLookup = {
    async loadIdByExternalId(): Promise<ReadonlyMap<number, string>> {
      return new Map(store.proposicao);
    },
  };

  const votacaoProposicaoRepository: VotacaoProposicaoRepository = {
    async upsert(rows) {
      let inserted = 0;
      let updated = 0;

      for (const row of rows) {
        store.writes += 1;
        const key = `${row.externalIdVotacao}:${row.externalIdProposicao}`;
        if (store.vinculo.has(key)) {
          updated += 1;
        } else {
          inserted += 1;
        }
        store.vinculo.add(key);
      }

      return { inserted, updated };
    },
  };

  const temaRepository: TemaRepository = {
    async upsertTemas(rows) {
      return upsertById(
        store,
        store.tema,
        'tema',
        rows.map((row) => row.externalCodTema),
      );
    },
    async upsertVinculos(rows) {
      let inserted = 0;
      let updated = 0;

      for (const row of rows) {
        store.writes += 1;
        const key = `pt:${row.externalIdProposicao}:${row.externalCodTema}`;
        if (store.vinculo.has(key)) {
          updated += 1;
        } else {
          inserted += 1;
        }
        store.vinculo.add(key);
      }

      return { inserted, updated };
    },
  };

  const temaLookup: TemaLookup = {
    async loadIdByExternalCodTema(): Promise<ReadonlyMap<number, string>> {
      return new Map(store.tema);
    },
  };

  const sanityRepository: SanityRepository = {
    async loadPlacares() {
      const rows = [];

      for (const [externalId, votos] of store.votacaoVotos) {
        const votacao = store.votacao.get(externalId);

        if (votacao === undefined) {
          continue;
        }

        rows.push({
          externalIdVotacao: externalId,
          votosSimOficial: votacao.votosSim,
          votosNaoOficial: votacao.votosNao,
          votosSimDerivado: votos.votosSim,
          votosNaoDerivado: votos.votosNao,
          outrosDerivado: {
            abstencao: votos.votosAbstencao,
            obstrucao: votos.votosObstrucao,
            artigo17: votos.votosArtigo17,
            naoInformado: votos.votosNaoInformado,
          },
        });
      }

      return rows;
    },
  };
  const fonteDerivada = createFonteDerivadaProposicoesAfetadas({
    proposicoesDownloader: downloader,
    temasDownloader: downloader,
  });

  return [
    createLegislaturasStep(legislaturaRepository),
    createDeputadosStep(deputadoRepository, legislaturaLookup),
    createPartidosStep(partidoRepository),
    createVotacoesStep(votacaoRepository),
    createVotacaoVotosStep({
      repository: votacaoVotosRepository,
      votacaoLookup,
      deputadoLookup,
    }),
    createProposicoesStep({ repository: proposicaoRepository, fonteDerivada }),
    createVotacaoProposicaoStep({
      repository: votacaoProposicaoRepository,
      votacaoLookup,
      proposicaoLookup,
    }),
    createTemaStep({
      repository: temaRepository,
      fonteDerivada,
      proposicaoLookup,
      temaLookup,
    }),
    historicoStep,
    createSanityStep(sanityRepository),
  ];
}

function createReporter(): IngestionReporter & { readonly lines: string[] } {
  const lines: string[] = [];

  return {
    lines,
    log(message) {
      lines.push(message);
    },
  };
}

function silentErrorLog() {
  return {
    fileSystem: {
      async mkdir() {},
      async writeFile() {},
    },
    now: () => new Date('2026-01-01T00:00:00.000Z'),
  };
}

function runPipeline(
  store: Store,
  args: readonly string[],
  reporter?: IngestionReporter,
) {
  return executeIngestionPipelineRunner(['--from=2024', '--to=2024', ...args], {
    currentYear: 2026,
    csvReader: readCsvRecords,
    openSource: (path) => Readable.from(routeCsv(path)),
    createSteps: async () => ({
      steps: buildSteps(store),
      close: async () => {},
    }),
    errorLog: silentErrorLog(),
    reporter,
  });
}

describe('full ingestion pipeline', () => {
  describe('when ingesting a representative window end to end', () => {
    it('runs the CSV-derived steps in dependency order, leaving the manual historico step out', async () => {
      // Arrange
      const store = createStore();

      // Act
      const result = await runPipeline(store, []);

      // Assert
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error(result.message);
      expect(result.summary.steps.map((step) => step.stepName)).toEqual([
        'legislaturas',
        'deputados',
        'partidos',
        'votacoes',
        'votacao_votos',
        'proposicoes',
        'votacao_proposicao',
        'tema',
        'sanity',
      ]);
      expect(store.legislatura.size).toBe(2);
      expect(store.deputado.size).toBe(2);
      expect(store.partido.size).toBe(1);
      expect(store.votacao.size).toBe(3);
      expect(store.votacaoVotos.size).toBe(3);
      expect(store.proposicao.size).toBe(2);
      expect(store.tema.size).toBe(1);
    });
  });

  describe('when historico is requested on its own', () => {
    it('runs only the manual deputado_historico step', async () => {
      // Arrange
      const store = createStore();

      // Act
      const result = await runPipeline(store, ['--only=deputado_historico']);

      // Assert
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error(result.message);
      expect(result.summary.steps.map((step) => step.stepName)).toEqual([
        'deputado_historico',
      ]);
    });
  });

  describe('sanity checks comparing official tallies to derived counts', () => {
    it('flags votações whose official placar diverges from the derived votes', async () => {
      // Arrange
      const store = createStore();
      const writes: { content: string }[] = [];

      // Act
      const result = await executeIngestionPipelineRunner(
        ['--from=2024', '--to=2024'],
        {
          currentYear: 2026,
          csvReader: readCsvRecords,
          openSource: (path) => Readable.from(routeCsv(path)),
          createSteps: async () => ({
            steps: buildSteps(store),
            close: async () => {},
          }),
          errorLog: {
            fileSystem: {
              async mkdir() {},
              async writeFile(_path: string, content: string) {
                writes.push({ content });
              },
            },
            now: () => new Date('2026-01-01T00:00:00.000Z'),
          },
        },
      );

      // Assert
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error(result.message);
      const sanity = result.summary.steps.find(
        (step) => step.stepName === 'sanity',
      );
      expect(sanity).toMatchObject({ read: 3, ignored: 0 });
      expect(sanity?.rejected).toHaveLength(1);
      expect(sanity?.rejected[0]).toMatchObject({
        type: 'sanity_placar_divergente',
        fields: { externalIdVotacao: '2024-2' },
      });
      expect(
        writes.some((w) => w.content.includes('sanity_placar_divergente')),
      ).toBe(true);
    });

    it('reports a votação with no individual votes in the source as an external gap', async () => {
      // Arrange
      const store = createStore();
      const writes: { content: string }[] = [];

      // Act
      const result = await executeIngestionPipelineRunner(
        ['--from=2024', '--to=2024'],
        {
          currentYear: 2026,
          csvReader: readCsvRecords,
          openSource: (path) => Readable.from(routeCsv(path)),
          createSteps: async () => ({
            steps: buildSteps(store),
            close: async () => {},
          }),
          errorLog: {
            fileSystem: {
              async mkdir() {},
              async writeFile(_path: string, content: string) {
                writes.push({ content });
              },
            },
            now: () => new Date('2026-01-01T00:00:00.000Z'),
          },
        },
      );

      // Assert
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error(result.message);
      const sanity = result.summary.steps.find(
        (step) => step.stepName === 'sanity',
      );
      expect(sanity?.externalGaps).toHaveLength(1);
      expect(sanity?.externalGaps[0]).toMatchObject({
        type: 'votos_individuais_ausentes',
        reference: '2024-3',
      });
      expect(
        writes.some((w) => w.content.includes('votos_individuais_ausentes')),
      ).toBe(true);
    });
  });

  describe('when the same window is ingested twice', () => {
    it('updates instead of inserting and keeps the database stable', async () => {
      // Arrange
      const store = createStore();

      // Act
      await runPipeline(store, []);
      const second = await runPipeline(store, []);

      // Assert
      expect(second.ok).toBe(true);
      if (!second.ok) throw new Error(second.message);
      expect(second.summary.totalInserted).toBe(0);
      expect(second.summary.totalUpdated).toBeGreaterThan(0);
      expect(store.votacao.size).toBe(3);
      expect(store.votacaoVotos.size).toBe(3);
      expect(store.proposicao.size).toBe(2);
    });
  });

  describe('when running the full pipeline in dry-run mode', () => {
    it('walks every step without writing to the repositories', async () => {
      // Arrange
      const store = createStore();

      // Act
      const result = await runPipeline(store, ['--dry-run']);

      // Assert
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error(result.message);
      expect(result.summary.dryRun).toBe(true);
      expect(result.summary.totalInserted).toBe(0);
      expect(store.writes).toBe(0);
      expect(store.votacao.size).toBe(0);
    });
  });

  describe('progress logging', () => {
    it('announces the run and each step as it starts', async () => {
      // Arrange
      const store = createStore();
      const reporter = createReporter();

      // Act
      await runPipeline(store, [], reporter);

      // Assert
      expect(reporter.lines[0]).toContain('Iniciando ingestão (normal)');
      expect(
        reporter.lines.some((line) =>
          line.startsWith('[legislaturas] iniciando'),
        ),
      ).toBe(true);
      expect(
        reporter.lines.some((line) =>
          line.includes('[sanity] comparando placar'),
        ),
      ).toBe(true);
    });
  });
});
