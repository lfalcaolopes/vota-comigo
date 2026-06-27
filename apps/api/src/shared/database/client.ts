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

  // Neon's pooled endpoint runs PgBouncer in transaction mode, which rejects the
  // session-level prepared statements postgres-js issues by default.
  const sql = postgres(url, { prepare: false });
  const db = drizzle(sql, { schema });

  return {
    db,
    close: async () => {
      await sql.end();
    },
  };
}
