import 'dotenv/config';

import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { createProposicoesRepository } from '@/proposicoes/proposicoes.repository';
import * as schema from '@/shared/database/schema';

import { assertCorpusMatchesProduction } from './diagnostico-busca/corpus';
import { loadConsultasFixture } from './diagnostico-busca/consultas-fixture';
import {
  ORDENACAO,
  PROFUNDIDADE,
  runConsulta,
} from './diagnostico-busca/runner';
import {
  buildBuscaConfig,
  buildResumo,
  toMarkdown,
  type ConsultaResultado,
  type DiagnosticoReport,
} from './diagnostico-busca/relatorio';

const REPO_ROOT = resolve(__dirname, '../../..');
const FIXTURE_PADRAO = resolve(REPO_ROOT, 'fixtures/consultas-busca.json');
const SAIDA_PADRAO = resolve(REPO_ROOT, 'fixtures/diagnostico');

void main();

async function main(): Promise<void> {
  try {
    await run();
  } catch (error) {
    console.error((error as Error).message);
    process.exitCode = 1;
  }
}

async function run(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  // Antes de abrir conexao: classificar contra um corpus diferente do varrido
  // pela busca produz diagnostico errado, entao aborta em vez de classificar.
  assertCorpusMatchesProduction();

  const fixtures = loadConsultasFixture(args.fixture);

  const url = process.env.DATABASE_URL;
  if (url === undefined || url === '') {
    throw new Error(
      'DATABASE_URL nao configurada. Defina a variavel de ambiente antes de rodar o diagnostico.',
    );
  }

  const client = postgres(url, {
    prepare: false,
    connection: { default_transaction_read_only: true },
  });
  const db = drizzle(client, { schema });

  try {
    const repository = createProposicoesRepository(db);

    const consultas: ConsultaResultado[] = [];
    for (const fixture of fixtures) {
      consultas.push(await runConsulta(db, repository, fixture));
    }

    const report = buildReport(consultas, url);
    const destino = resolve(
      args.saida,
      `busca-${toFileTimestamp(report.cabecalho.timestamp)}.json`,
    );

    mkdirSync(args.saida, { recursive: true });
    writeFileSync(destino, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

    console.log(toMarkdown(report));
    console.error(`\nJSON escrito em ${destino}`);
  } finally {
    await client.end();
  }
}

function buildReport(
  consultas: readonly ConsultaResultado[],
  url: string,
): DiagnosticoReport {
  return {
    cabecalho: {
      timestamp: new Date().toISOString(),
      commit: readGit(['rev-parse', 'HEAD']) ?? 'desconhecido',
      commitLimpo: readGit(['status', '--porcelain']) === '',
      banco: describeBanco(url),
      profundidade: PROFUNDIDADE,
      ordenacao: `${ORDENACAO} (volume_votacoes_plenario desc, sem relevancia textual)`,
    },
    buscaConfig: buildBuscaConfig(),
    consultas,
    resumo: buildResumo(consultas),
  };
}

function parseArgs(argv: readonly string[]): {
  fixture: string;
  saida: string;
} {
  let fixture = FIXTURE_PADRAO;
  let saida = SAIDA_PADRAO;

  for (const arg of argv) {
    if (arg.startsWith('--fixture=')) {
      fixture = resolve(process.cwd(), arg.slice('--fixture='.length));
    } else if (arg.startsWith('--saida=')) {
      saida = resolve(process.cwd(), arg.slice('--saida='.length));
    } else {
      throw new Error(
        `Argumento desconhecido: ${arg}. Use --fixture=<arquivo> e --saida=<diretorio>.`,
      );
    }
  }

  return { fixture, saida };
}

function readGit(args: readonly string[]): string | null {
  try {
    return execFileSync('git', [...args], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    }).trim();
  } catch {
    return null;
  }
}

// Sem credenciais: o relatorio e commitavel e compartilhavel.
function describeBanco(url: string): string {
  try {
    const parsed = new URL(url);
    const port = parsed.port === '' ? '5432' : parsed.port;
    return `${parsed.hostname}:${port}${parsed.pathname}`;
  } catch {
    return '(DATABASE_URL nao parseavel)';
  }
}

function toFileTimestamp(timestamp: string): string {
  return timestamp.replace(/[:.]/g, '-');
}
