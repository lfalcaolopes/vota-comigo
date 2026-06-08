export const LIMIT_DEFAULT = 20;
export const LIMIT_MAX = 100;
export const LIMIT_MIN = 1;
export const OFFSET_DEFAULT = 0;

export type Pagination = {
  limit: number;
  offset: number;
};

function isValidNumber(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function normalizePagination(
  rawLimit: number | undefined,
  rawOffset: number | undefined,
): Pagination {
  const limit = isValidNumber(rawLimit)
    ? Math.min(Math.max(Math.trunc(rawLimit), LIMIT_MIN), LIMIT_MAX)
    : LIMIT_DEFAULT;
  const offset = isValidNumber(rawOffset)
    ? Math.max(Math.trunc(rawOffset), OFFSET_DEFAULT)
    : OFFSET_DEFAULT;

  return { limit, offset };
}
