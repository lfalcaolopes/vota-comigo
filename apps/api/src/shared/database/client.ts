import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from './schema';

export type DrizzleDatabase = ReturnType<typeof drizzle<typeof schema>>;

export type DatabaseClient = {
  db: DrizzleDatabase;
  close: () => Promise<void>;
};

export function createDatabaseClient(
  url: string | undefined = process.env.DATABASE_URL,
): DatabaseClient {
  if (url === undefined || url === '') {
    throw new Error(
      'DATABASE_URL não configurada. Defina a variável de ambiente antes de executar a ingestão.',
    );
  }

  const sql = postgres(url);
  const db = drizzle(sql, { schema });

  return {
    db,
    close: async () => {
      await sql.end();
    },
  };
}
