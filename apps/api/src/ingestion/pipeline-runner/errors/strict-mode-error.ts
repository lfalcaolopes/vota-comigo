import type {
  ExternalGap,
  Rejection,
} from '../types/ingestion-pipeline-runner.types';

export class StrictModeError extends Error {
  constructor(
    readonly rejection?: Rejection,
    readonly gap?: ExternalGap,
  ) {
    super(
      rejection
        ? `Modo estrito abortou em ${rejection.file}:${rejection.line} (${rejection.type}): ${rejection.message}`
        : `Modo estrito abortou (${gap?.type ?? 'desconhecido'}): ${gap?.message ?? ''}`,
    );
    this.name = 'StrictModeError';
  }

  static fromGap(gap: ExternalGap): StrictModeError {
    return new StrictModeError(undefined, gap);
  }
}
