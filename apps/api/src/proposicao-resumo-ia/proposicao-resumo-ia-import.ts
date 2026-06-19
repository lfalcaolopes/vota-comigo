import { readFile } from 'node:fs/promises';

import {
  createDatabaseClient,
  type DatabaseClient,
} from '@/shared/database/client';
import { importProposicaoResumoIaJson } from './proposicao-resumo-ia-importer';
import { createProposicaoResumoIaRepository } from './proposicao-resumo-ia.repository';
import type { ProposicaoResumoIaRepository } from './proposicao-resumo-ia.repository.types';

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
  const filePath = importArgs[0];

  if (filePath === undefined) {
    return {
      ok: false,
      exitCode: 1,
      message: 'Informe o caminho do JSON anual de resumos.',
    };
  }

  const loadFile =
    options.readFile ?? ((path: string) => readFile(path, 'utf8'));
  const content = await loadFile(filePath);
  const json = JSON.parse(content) as unknown;
  let databaseClient: DatabaseClient | null = null;
  let repository = options.repository;

  if (repository === undefined) {
    databaseClient = createDatabaseClient();
    repository = createProposicaoResumoIaRepository(databaseClient.db);
  }

  try {
    const result = await importProposicaoResumoIaJson(json, { repository });
    options.reporter?.log(`Resumos importados: ${result.imported}`);
    if (result.missing.length > 0) {
      options.reporter?.log(
        `Proposições não encontradas: ${result.missing.join(', ')}`,
      );
    }

    return {
      ok: true,
      exitCode: result.missing.length > 0 ? 1 : 0,
      message: 'Importação de resumos concluída.',
    };
  } finally {
    await databaseClient?.close();
  }
}
