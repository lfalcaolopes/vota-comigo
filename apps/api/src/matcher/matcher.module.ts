import { Module } from '@nestjs/common';

import type { DrizzleDatabase } from '@/shared/database/client';
import { DATABASE } from '@/shared/database/database.module';

import { MatcherController } from './matcher.controller';
import {
  MATCHER_REPOSITORY,
  createMatcherRepository,
} from './matcher.repository';
import { MatcherService } from './matcher.service';

@Module({
  controllers: [MatcherController],
  providers: [
    MatcherService,
    {
      provide: MATCHER_REPOSITORY,
      inject: [DATABASE],
      useFactory: (db: DrizzleDatabase) => createMatcherRepository(db),
    },
  ],
})
export class MatcherModule {}
