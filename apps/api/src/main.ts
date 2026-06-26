import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';

import { AppModule } from './app.module';

function parseOrigins(raw: string | undefined): string[] {
  const value = raw?.trim();
  if (value === undefined || value === '') {
    return ['http://localhost:3000'];
  }
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin !== '');
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.use(helmet());
  app.set('trust proxy', 1);

  app.enableCors({
    origin: parseOrigins(process.env.WEB_ORIGIN),
  });
  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 3001);
}
void bootstrap();
