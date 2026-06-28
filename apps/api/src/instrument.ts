import 'dotenv/config';

import * as Sentry from '@sentry/nestjs';

import {
  resolveTracesSampleRate,
  shouldInitSentry,
} from './shared/observability/should-init-sentry';

const dsn = process.env.SENTRY_DSN;
const nodeEnv = process.env.NODE_ENV;

if (shouldInitSentry({ dsn, nodeEnv })) {
  Sentry.init({
    dsn,
    environment: nodeEnv,
    tracesSampleRate: resolveTracesSampleRate(
      process.env.SENTRY_TRACES_SAMPLE_RATE,
    ),
  });
}
