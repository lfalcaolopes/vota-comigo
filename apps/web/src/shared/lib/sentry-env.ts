const DEFAULT_TRACES_SAMPLE_RATE = 0.1;

export function shouldInitSentry(
  dsn: string | undefined,
  nodeEnv: string | undefined,
): boolean {
  const trimmed = dsn?.trim();
  return nodeEnv === "production" && trimmed !== undefined && trimmed !== "";
}

export function tracesSampleRate(): number {
  return DEFAULT_TRACES_SAMPLE_RATE;
}
