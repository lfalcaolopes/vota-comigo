/**
 * Normaliza a `siglaPartido` da fonte da Câmara para persistência. A fonte anexa
 * asteriscos finais para desambiguar instâncias historicas de um mesmo partido
 * (`PP***`, `MDB*`); o asterisco é ruido de exibição, não parte da sigla, e o
 * `externalIdPartido` já identifica a linha. Remove os asteriscos finais e o
 * espaco ao redor, retornando `null` quando nada util sobra.
 */
export function normalizeSiglaPartido(
  value: string | null | undefined,
): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const stripped = value.trim().replace(/\*+$/, '').trim();

  return stripped === '' ? null : stripped;
}
