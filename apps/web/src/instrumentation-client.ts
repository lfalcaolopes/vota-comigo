import * as Sentry from "@sentry/nextjs";

import { shouldInitSentry, tracesSampleRate } from "@/shared/lib/sentry-env";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (shouldInitSentry(dsn, process.env.NODE_ENV)) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    tracesSampleRate: tracesSampleRate(),
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
