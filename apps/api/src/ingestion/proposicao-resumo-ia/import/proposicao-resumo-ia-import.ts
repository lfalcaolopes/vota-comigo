import { readFile } from 'node:fs/promises';

import { ZodError } from 'zod';
import {
  createDatabaseClient,
  type DatabaseClient,
} from '@/shared/database/client';
import {
  type ProposicaoResumoIaImportReport,
  importProposicaoResumoIaJson,
} from './proposicao-resumo-ia-importer';
import { createProposicaoResumoIaRepository } from '../repository/proposicao-resumo-ia.repository';
import type { ProposicaoResumoIaRepository } from '../repository/proposicao-resumo-ia.repository.types';

export type ProposicaoResumoIaImportExecutionResult = {
  ok: boolean;
  exitCode: number;
  message: string;
};

export type ProposicaoResumoIaImportOptions = {
  repository?: ProposicaoResumoIaRepository;
  readFile?: (path: string) => Promise<string>;
  reporter?: { log(message: string): void };
};

export async function executeProposicaoResumoIaImport(
  args: readonly string[],
  options: ProposicaoResumoIaImportOptions = {},
): Promise<ProposicaoResumoIaImportExecutionResult> {
  const importArgs = args[0] === '--' ? args.slice(1) : args;
  const filePaths = importArgs;

  if (filePaths.length === 0) {
    return {
      ok: false,
      exitCode: 1,
      message: 'Informe o caminho do JSON anual de resumos.',
    };
  }

  const loadFile =
    options.readFile ?? ((path: string) => readFile(path, 'utf8'));
  let databaseClient: DatabaseClient | null = null;
  let repository = options.repository;

  if (repository === undefined) {
    databaseClient = createDatabaseClient();
    repository = createProposicaoResumoIaRepository(databaseClient.db);
  }

  try {
    let report = emptyReport();

    for (const filePath of filePaths) {
      const content = await loadFile(filePath);
      const fileReport = await importFileContent(content, repository);
      if (fileReport === null) {
        return {
          ok: false,
          exitCode: 1,
          message: `JSON anual inválido em ${filePath}.`,
        };
      }
      report = mergeReports(report, fileReport);
    }

    options.reporter?.log(`Arquivos lidos: ${report.filesRead}`);
    options.reporter?.log(`Itens válidos: ${report.validItems}`);
    options.reporter?.log(`Resumos importados: ${report.imported}`);
    options.reporter?.log(`Inseridos: ${report.inserted}`);
    options.reporter?.log(`Atualizados: ${report.updated}`);
    options.reporter?.log(`Ignorados: ${report.skipped}`);
    if (report.missingExternalIdProposicao.length > 0) {
      options.reporter?.log(
        `Proposições não encontradas: ${report.missingExternalIdProposicao.join(', ')}`,
      );
    }

    return {
      ok: true,
      exitCode: report.missingExternalIdProposicao.length > 0 ? 1 : 0,
      message: 'Importação de resumos concluída.',
    };
  } finally {
    await databaseClient?.close();
  }
}

async function importFileContent(
  content: string,
  repository: ProposicaoResumoIaRepository,
): Promise<ProposicaoResumoIaImportReport | null> {
  try {
    const json = JSON.parse(content) as unknown;
    return await importProposicaoResumoIaJson(json, { repository });
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof ZodError) {
      return null;
    }
    throw error;
  }
}

function emptyReport(): ProposicaoResumoIaImportReport {
  return {
    filesRead: 0,
    validItems: 0,
    imported: 0,
    inserted: 0,
    updated: 0,
    skipped: 0,
    missingExternalIdProposicao: [],
  };
}

function mergeReports(
  left: ProposicaoResumoIaImportReport,
  right: ProposicaoResumoIaImportReport,
): ProposicaoResumoIaImportReport {
  return {
    filesRead: left.filesRead + right.filesRead,
    validItems: left.validItems + right.validItems,
    imported: left.imported + right.imported,
    inserted: left.inserted + right.inserted,
    updated: left.updated + right.updated,
    skipped: left.skipped + right.skipped,
    missingExternalIdProposicao: [
      ...left.missingExternalIdProposicao,
      ...right.missingExternalIdProposicao,
    ],
  };
}
