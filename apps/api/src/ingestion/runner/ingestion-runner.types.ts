export type IngestionRunnerConfig = {
  only?: readonly string[];
  years: readonly number[];
  dryRun: boolean;
  strict: boolean;
  debug: boolean;
  refetchHistorico: boolean;
  limit?: number;
  retryGapsPath?: string;
};

export type IngestionRunnerConfigResolution =
  | {
      ok: true;
      config: IngestionRunnerConfig;
    }
  | {
      ok: false;
      message: string;
    };

export type IngestionRunnerConfigOptions = {
  currentYear?: number;
  stepNames?: readonly string[];
};

export type StepScope = 'single' | 'annual';

export type StepSource = 'csv' | 'api' | 'derived' | 'db';

export type IngestionStepDescriptor = {
  readonly name: string;
  readonly scope: StepScope;
  readonly dataset?: string;
  readonly source?: StepSource;
  // Extra datasets the step reads alongside its primary source, resolved per year
  // by the orchestrator and exposed through context.readCompanion.
  readonly companionDatasets?: readonly string[];
  // Passo fora da execução padrão: só roda quando nomeado explicitamente em
  // `--only`. Usado para passos que exigem condução manual (ex.: histórico via
  // API da Câmara, lento e sujeito a indisponibilidade).
  readonly manual?: boolean;
};

export type IngestionPlanEntry = {
  stepName: string;
  scope: StepScope;
  dataset?: string;
  companionDatasets?: readonly string[];
  year?: number;
};

export type Rejection = {
  file: string;
  line: number;
  type: string;
  fields: Record<string, string>;
  message: string;
};

export type ExternalGap = {
  file: string;
  type: string;
  reference: string;
  message: string;
};

export type StepRunResult = {
  read: number;
  inserted: number;
  updated: number;
  ignored: number;
  rejected: Rejection[];
  externalGaps: ExternalGap[];
};

export type CsvRowSource = () => AsyncIterable<import('./csv-reader').CsvRow>;

export type IngestionStepContext = {
  readonly dryRun: boolean;
  readonly strict: boolean;
  readonly debug: boolean;
  readonly limit?: number;
  readonly sourceFile: string;
  // Ano do arquivo anual em processamento, quando aplicável. Permite que passos
  // anuais rotulem o progresso com o mesmo ano que o orquestrador reporta.
  readonly year?: number;
  readonly reporter?: IngestionReporter;
  readRecords: CsvRowSource;
  // Opens a companion dataset declared in companionDatasets for the same year.
  // Returns undefined when the companion source for that year is absent.
  readCompanion?: (dataset: string) => CsvRowSource | undefined;
  // Scope years (respeitando --from/--to), provided to derived steps that
  // precisam varrer múltiplos anos por conta própria.
  readonly years?: readonly number[];
  // Abre qualquer dataset anual para um ano arbitrário. Undefined quando o
  // arquivo do ano está ausente em disco.
  readDataset?: (dataset: string, year: number) => CsvRowSource | undefined;
};

export type IngestionStep = IngestionStepDescriptor & {
  run(context: IngestionStepContext): Promise<StepRunResult>;
};

export type StepSummary = StepRunResult & {
  stepName: string;
  year?: number;
  durationMs: number;
};

export type IngestionSummary = {
  steps: StepSummary[];
  totalRead: number;
  totalInserted: number;
  totalUpdated: number;
  totalIgnored: number;
  totalRejected: number;
  totalExternalGaps: number;
  dryRun: boolean;
  strict: boolean;
  years: readonly number[];
  errorLogPath?: string;
  gapLogPath?: string;
  aborted?: boolean;
};

export type IngestionRunnerResult =
  | {
      ok: true;
      config: IngestionRunnerConfig;
      plan: readonly IngestionPlanEntry[];
    }
  | {
      ok: false;
      message: string;
    };

export type IngestionRunnerExecutionResult =
  | {
      ok: true;
      exitCode: 0 | 1;
      summary: IngestionSummary;
    }
  | {
      ok: false;
      exitCode: 1;
      message: string;
    };

export type IngestionReporter = {
  log(message: string): void;
  error?(message: string): void;
  // Append-only event feed line, emitted only while debug mode is on.
  debug?(message: string): void;
  // Live status line that rewrites itself in a TTY and is silent otherwise.
  status?(message: string): void;
};

export type CreateStepsInput = {
  dryRun: boolean;
  retryExternalIds?: readonly number[];
  refetchHistorico?: boolean;
};

export type CreateStepsResult = {
  steps: readonly IngestionStep[];
  close: () => Promise<void>;
};
