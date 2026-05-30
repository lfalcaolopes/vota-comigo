/**
 * Extrai o identificador externo numérico do final de uma URI dos Dados Abertos
 * da Câmara (`.../deputados/{id}`, `.../partidos/{id}`). Retorna `null` quando a
 * URI está ausente, vazia ou não termina em um inteiro positivo.
 */
export function extractExternalIdFromUri(
  uri: string | undefined,
): number | null {
  if (uri === undefined) {
    return null;
  }

  const segments = uri.split('/').filter((segment) => segment !== '');
  const lastSegment = segments[segments.length - 1];

  if (lastSegment === undefined || !/^\d+$/.test(lastSegment)) {
    return null;
  }

  return Number(lastSegment);
}
