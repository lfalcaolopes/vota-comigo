export function toDeputadoSlug(nomePublico: string): string {
  return nomePublico
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function buildDeputadoHref(
  externalIdDeputado: number,
  nomePublico: string | null,
): `/deputados/${string}` {
  const slug = toDeputadoSlug(nomePublico ?? "nome-nao-informado");
  return `/deputados/${externalIdDeputado}-${slug}`;
}

export function parseExternalIdDeputado(segment: string): number | null {
  const match = /^(\d+)(?:-|$)/.exec(segment);
  if (match === null) return null;

  const externalIdDeputado = Number(match[1]);
  return Number.isSafeInteger(externalIdDeputado) && externalIdDeputado > 0
    ? externalIdDeputado
    : null;
}
