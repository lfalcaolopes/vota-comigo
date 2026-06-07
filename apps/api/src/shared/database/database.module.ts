import {
  Global,
  Injectable,
  Module,
  OnApplicationShutdown,
} from '@nestjs/common';

import { createDatabaseClient } from './client';
import type { DatabaseClient, DrizzleDatabase } from './client';

export const DATABASE = Symbol('DATABASE');

@Injectable()
export class DatabaseConnection implements OnApplicationShutdown {
  private readonly client: DatabaseClient = createDatabaseClient();

  get db(): DrizzleDatabase {
    return this.client.db;
  }

  async onApplicationShutdown(): Promise<void> {
    await this.client.close();
  }
}

@Global()
@Module({
  providers: [
    DatabaseConnection,
    {
      provide: DATABASE,
      inject: [DatabaseConnection],
      useFactory: (connection: DatabaseConnection): DrizzleDatabase =>
        connection.db,
    },
  ],
  exports: [DATABASE],
})
export class DatabaseModule {}
