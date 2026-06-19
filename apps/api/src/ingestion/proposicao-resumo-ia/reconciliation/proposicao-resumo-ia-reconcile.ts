import { readFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';

import { ZodError } from 'zod';
import {
  createDatabaseClient,
  type DatabaseClient,
} from '@/shared/database/client';
import {
  reconcileProposicaoResumoIa,
  type ProposicaoResumoIaReconcileReport,
} from './proposicao-resumo-ia-reconciler';
import { proposicaoResumoIaJsonSchema } from '../schemas/proposicao-resumo-ia-json.schema';
import type { ProposicaoResumoIaJson } from '../schemas/proposicao-resumo-ia-json.schema';
import { createProposicaoResumoIaRepository } from '../repository/proposicao-resumo-ia.repository';
import type { ProposicaoResumoIaRepository } from '../repository/proposicao-resumo-ia.repository.types';

const GENERATED_DIR = 'data/generated/proposicao-resumos';

export type ProposicaoResumoIaReconcileExecutionResult = {
  ok: boolean;
  exitCode: number;
  message: string;
};

export type ProposicaoResumoIaReconcileOptions = {
  repository?: ProposicaoResumoIaRepository;
  readFile?: (filePath: string) => Promise<string>;
  writeFile?: (filePath: string, content: string) => Promise<void>;
  readdir?: (dir: string) => Promise<readonly string[]>;
  reporter?: { log(message: string): void };
};

export async function executeProposicaoResumoIaReconcile(
  _args: readonly string[],
  options: ProposicaoResumoIaReconcileOptions = {},
): Promise<ProposicaoResumoIaReconcileExecutionResult> {
  const loadFile =
    options.readFile ?? ((filePath: string) => readFile(filePath, 'utf8'));
  const saveFile =
    options.writeFile ??
    ((filePath: string, content: string) =>
      writeFile(filePath, content, 'utf8'));
  const listDir = options.readdir ?? ((dir: string) => readdir(dir));

  let databaseClient: DatabaseClient | null = null;
  let repository = options.repository;

  if (repository === undefined) {
    databaseClient = createDatabaseClient();
    repository = createProposicaoResumoIaRepository(databaseClient.db);
  }

  try {
    const sources = await repository.loadProposicoesComputaveisSources();
    const filenames = await listDir(GENERATED_DIR);
    const jsonFilenames = filenames.filter((f) => f.endsWith('.json'));

    const inputFiles: ProposicaoResumoIaJson[] = [];
    const inputFilePaths: string[] = [];

    for (const filename of jsonFilenames) {
      const filePath = path.join(GENERATED_DIR, filename);
      const content = await loadFile(filePath);
      const parsed = parseJsonFile(content);
      if (parsed === null) {
        return {
          ok: false,
          exitCode: 1,
          message: `JSON anual inválido em ${filePath}.`,
        };
      }
      inputFiles.push(parsed);
      inputFilePaths.push(filePath);
    }

    const { files: outputFiles, report } = reconcileProposicaoResumoIa({
      sources,
      files: inputFiles,
    });

    let filesWritten = 0;
    for (let i = 0; i < inputFiles.length; i++) {
      if (outputFiles[i] !== inputFiles[i]) {
        await saveFile(
          inputFilePaths[i],
          JSON.stringify(outputFiles[i], null, 2),
        );
        filesWritten++;
      }
    }

    logReport(options.reporter, report, filesWritten);

    return {
      ok: true,
      exitCode: report.pendingExternalIdProposicao.length > 0 ? 1 : 0,
      message: 'Reconciliação de resumos concluída.',
    };
  } finally {
    await databaseClient?.close();
  }
}

function parseJsonFile(content: string): ProposicaoResumoIaJson | null {
  try {
    const json = JSON.parse(content) as unknown;
    return proposicaoResumoIaJsonSchema.parse(json);
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof ZodError) {
      return null;
    }
    throw error;
  }
}

function logReport(
  reporter: ProposicaoResumoIaReconcileOptions['reporter'],
  report: ProposicaoResumoIaReconcileReport,
  filesWritten: number,
): void {
  reporter?.log(`Proposições computáveis: ${report.proposicoesComputaveis}`);
  reporter?.log(`Preservados: ${report.preserved}`);
  reporter?.log(`Marcados stale: ${report.markedStale}`);
  reporter?.log(`Pendentes: ${report.pendingExternalIdProposicao.length}`);
  reporter?.log(`Arquivos escritos: ${filesWritten}`);
  if (report.pendingExternalIdProposicao.length > 0) {
    reporter?.log(
      `Proposições sem item no JSON: ${report.pendingExternalIdProposicao.join(', ')}`,
    );
  }
}
