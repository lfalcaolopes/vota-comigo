const DEFAULT_TRACES_SAMPLE_RATE = 0.1;

export type SentryRuntimeEnv = {
  dsn: string | undefined;
  nodeEnv: string | undefined;
};

export function shouldInitSentry(env: SentryRuntimeEnv): boolean {
  const dsn = env.dsn?.trim();
  return env.nodeEnv === 'production' && dsn !== undefined && dsn !== '';
}

export function resolveTracesSampleRate(raw: string | undefined): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) {
    return DEFAULT_TRACES_SAMPLE_RATE;
  }
  return parsed;
}
