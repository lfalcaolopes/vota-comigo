export type IngestionRunnerConfig = {
  only?: readonly string[];
  years: readonly number[];
  dryRun: boolean;
  strict: boolean;
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

export type StepSource = 'csv' | 'api';

export type IngestionStepDescriptor = {
  readonly name: string;
  readonly scope: StepScope;
  readonly dataset?: string;
  readonly source?: StepSource;
};

export type IngestionPlanEntry = {
  stepName: string;
  scope: StepScope;
  dataset?: string;
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
  readonly sourceFile: string;
  readRecords: CsvRowSource;
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
};

export type CreateStepsInput = {
  dryRun: boolean;
};

export type CreateStepsResult = {
  steps: readonly IngestionStep[];
  close: () => Promise<void>;
};
