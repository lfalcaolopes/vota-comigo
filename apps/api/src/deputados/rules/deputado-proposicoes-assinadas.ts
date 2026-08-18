type ContadorAssinaturas = readonly [assinadas: number, primeiras: number];

export function somarAssinaturasDoAno(
  assinaturasJson: Record<string, ContadorAssinaturas>,
): { total: number; totalPrimeiroSignatario: number } {
  let total = 0;
  let totalPrimeiroSignatario = 0;

  for (const bucket of Object.values(assinaturasJson)) {
    if (!isContadorAssinaturas(bucket)) continue;
    total += bucket[0];
    totalPrimeiroSignatario += bucket[1];
  }

  return { total, totalPrimeiroSignatario };
}

function isContadorAssinaturas(value: unknown): value is ContadorAssinaturas {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === 'number' &&
    typeof value[1] === 'number'
  );
}
