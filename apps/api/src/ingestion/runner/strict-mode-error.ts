import type { Rejection } from './ingestion-runner.types';

export class StrictModeError extends Error {
  constructor(readonly rejection: Rejection) {
    super(
      `Modo estrito abortou em ${rejection.file}:${rejection.line} (${rejection.type}): ${rejection.message}`,
    );
    this.name = 'StrictModeError';
  }
}
