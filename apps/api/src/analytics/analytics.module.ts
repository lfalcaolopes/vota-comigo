import { Module } from '@nestjs/common';

import type { DrizzleDatabase } from '@/shared/database/client';
import { DATABASE } from '@/shared/database/database.module';

import { AnalyticsController } from './analytics.controller';
import {
  ANALYTICS_REPOSITORY,
  createAnalyticsRepository,
} from './analytics.repository';
import { AnalyticsService } from './analytics.service';

@Module({
  controllers: [AnalyticsController],
  providers: [
    AnalyticsService,
    {
      provide: ANALYTICS_REPOSITORY,
      inject: [DATABASE],
      useFactory: (db: DrizzleDatabase) => createAnalyticsRepository(db),
    },
  ],
})
export class AnalyticsModule {}
