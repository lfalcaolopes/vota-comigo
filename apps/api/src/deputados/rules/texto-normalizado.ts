import { sql, type SQL } from 'drizzle-orm';

// translate() cobre maiusculas e minusculas acentuadas para que lower() so
// precise lidar com ASCII: o comportamento de lower() sobre acentos depende da
// collation do banco, que difere entre o Postgres local e o Neon.
export const ACENTOS_SQL = {
  de: 'ÀÁÂÃÄÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝàáâãäçèéêëìíîïñòóôõöùúûüý',
  para: 'aaaaaceeeeiiiinooooouuuuyaaaaaceeeeiiiinooooouuuuy',
} as const;

export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('pt-BR');
}

export function normalizedColumn(column: unknown): SQL {
  return sql`lower(translate(${column}, ${ACENTOS_SQL.de}, ${ACENTOS_SQL.para}))`;
}

export function toLikePattern(term: string): string {
  const escaped = term.replace(/([\\%_])/g, '\\$1');
  return `%${escaped}%`;
}
