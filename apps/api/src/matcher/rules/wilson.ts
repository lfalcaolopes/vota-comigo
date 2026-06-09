export function wilsonLowerBound(
  sucessos: number,
  total: number,
  z = 1.96,
): number {
  if (total === 0) {
    return 0;
  }

  const p = sucessos / total;
  const denom = 1 + (z * z) / total;
  const center = p + (z * z) / (2 * total);
  const margin = z * Math.sqrt((p * (1 - p) + (z * z) / (4 * total)) / total);

  return (center - margin) / denom;
}
