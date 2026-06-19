import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import path from 'node:path';

import { ZodError } from 'zod';
import {
  createDatabaseClient,
  type DatabaseClient,
} from '@/shared/database/client';
import {
  proposicaoResumoIaJsonSchema,
  type ProposicaoResumoIaJson,
} from './proposicao-resumo-ia-json.schema';
import { createProposicaoResumoIaRepository } from './proposicao-resumo-ia.repository';
import type { ProposicaoResumoIaRepository } from './proposicao-resumo-ia.repository.types';
import {
  createOpenrouterResumoIaClient,
  type ResumoIaGenerationClient,
} from './openrouter-resumo-ia-client';
import {
  selectProposicaoResumoIaGenerationTargets,
  applyProposicaoResumoIaGeneration,
  type ProposicaoResumoIaGenerationResult,
} from './proposicao-resumo-ia-generator';
import { resolveProposicaoResumoIaGenerateConfig } from './proposicao-resumo-ia-generate.config';
import { PROPOSICAO_RESUMO_IA_PROMPT_VERSION } from './proposicao-resumo-ia-prompt';

const GENERATED_DIR = 'data/generated/proposicao-resumos';

export type ProposicaoResumoIaGenerateExecutionResult = {
  ok: boolean;
  exitCode: number;
  message: string;
};

export type ProposicaoResumoIaGenerateOptions = {
  repository?: ProposicaoResumoIaRepository;
  aiClient?: ResumoIaGenerationClient;
  readFile?: (filePath: string) => Promise<string>;
  writeFile?: (filePath: string, content: string) => Promise<void>;
  readdir?: (dir: string) => Promise<readonly string[]>;
  mkdir?: (dir: string) => Promise<void>;
  reporter?: { log(message: string): void };
};

export async function executeProposicaoResumoIaGenerate(
  args: readonly string[],
  options: ProposicaoResumoIaGenerateOptions = {},
): Promise<ProposicaoResumoIaGenerateExecutionResult> {
  const configResult = resolveProposicaoResumoIaGenerateConfig(args);
  if (!configResult.ok) {
    return { ok: false, exitCode: 1, message: configResult.message };
  }
  const config = configResult.config;

  const loadFile =
    options.readFile ?? ((filePath: string) => readFile(filePath, 'utf8'));
  const saveFile =
    options.writeFile ??
    ((filePath: string, content: string) =>
      writeFile(filePath, content, 'utf8'));
  const listDir = options.readdir ?? ((dir: string) => readdir(dir));
  const createDir =
    options.mkdir ??
    ((dir: string) => mkdir(dir, { recursive: true }).then(() => undefined));

  let databaseClient: DatabaseClient | null = null;
  let repository = options.repository;
  let aiClient = options.aiClient;
  let modelName: string;

  if (repository === undefined) {
    databaseClient = createDatabaseClient();
    repository = createProposicaoResumoIaRepository(databaseClient.db);
  }

  if (aiClient === undefined) {
    const apiKey = process.env['OPENROUTER_API_KEY'];
    const model = process.env['OPENROUTER_MODEL'];
    if (!apiKey) {
      await databaseClient?.close();
      return {
        ok: false,
        exitCode: 1,
        message:
          'OPENROUTER_API_KEY não configurada. Defina a variável de ambiente antes de gerar resumos.',
      };
    }
    if (!model) {
      await databaseClient?.close();
      return {
        ok: false,
        exitCode: 1,
        message:
          'OPENROUTER_MODEL não configurado. Defina a variável de ambiente antes de gerar resumos.',
      };
    }
    aiClient = createOpenrouterResumoIaClient({ apiKey, model });
    modelName = model;
  } else {
    modelName = process.env['OPENROUTER_MODEL'] ?? '';
  }

  try {
    const allSources = await repository.loadProposicoesComputaveisSources();

    let filteredSources = allSources.filter((src) => {
      if (config.year !== undefined && src.ano !== config.year) return false;
      if (
        config.externalIdProposicao !== undefined &&
        src.externalIdProposicao !== config.externalIdProposicao
      )
        return false;
      return true;
    });

    if (config.limit !== undefined) {
      filteredSources = filteredSources.slice(0, config.limit);
    }

    const filenames = await safeReaddir(listDir, GENERATED_DIR);
    const jsonFilenames = filenames.filter((f) => f.endsWith('.json'));

    const inputFiles: ProposicaoResumoIaJson[] = [];
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
    }

    const targets = selectProposicaoResumoIaGenerationTargets({
      sources: filteredSources,
      files: inputFiles,
      regenerate: config.regenerate,
    });
    const skipped = filteredSources.length - targets.length;

    const generatedAt = new Date().toISOString();
    const results: ProposicaoResumoIaGenerationResult[] = [];
    for (const target of targets) {
      const outcome = await aiClient.generate(target);
      if (!outcome.ok) {
        options.reporter?.log(
          `Erro em ${target.externalIdProposicao}: ${outcome.reason}`,
        );
      }
      results.push({ source: target, outcome });
    }

    const { files: outputFiles, report } = applyProposicaoResumoIaGeneration({
      files: inputFiles,
      results,
      model: modelName,
      promptVersion: PROPOSICAO_RESUMO_IA_PROMPT_VERSION,
      generatedAt,
    });

    await createDir(GENERATED_DIR);

    const inputFileByAno = new Map(inputFiles.map((f) => [f.ano, f]));
    let filesWritten = 0;
    for (const outputFile of outputFiles) {
      const inputFile = inputFileByAno.get(outputFile.ano);
      if (inputFile !== outputFile) {
        const filePath = path.join(GENERATED_DIR, `${outputFile.ano}.json`);
        await saveFile(filePath, JSON.stringify(outputFile, null, 2));
        filesWritten++;
      }
    }

    logReport(options.reporter, { ...report, skipped, filesWritten });

    return { ok: true, exitCode: 0, message: 'Geração de resumos concluída.' };
  } finally {
    await databaseClient?.close();
  }
}

async function safeReaddir(
  listDir: (dir: string) => Promise<readonly string[]>,
  dir: string,
): Promise<readonly string[]> {
  try {
    return await listDir(dir);
  } catch (error) {
    if (isEnoent(error)) return [];
    throw error;
  }
}

function isEnoent(error: unknown): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    (error as NodeJS.ErrnoException).code === 'ENOENT'
  );
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
  reporter: ProposicaoResumoIaGenerateOptions['reporter'],
  report: {
    generated: number;
    insufficientSource: number;
    error: number;
    skipped: number;
    filesWritten: number;
  },
): void {
  reporter?.log(`Gerados: ${report.generated}`);
  reporter?.log(`Fonte insuficiente: ${report.insufficientSource}`);
  reporter?.log(`Erros: ${report.error}`);
  reporter?.log(`Ignorados (já gerados): ${report.skipped}`);
  reporter?.log(`Arquivos escritos: ${report.filesWritten}`);
}
