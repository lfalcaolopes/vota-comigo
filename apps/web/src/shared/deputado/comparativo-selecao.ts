import {
  MAX_COMPARATIVO_DEPUTADOS,
  MIN_COMPARATIVO_DEPUTADOS,
} from "@vota-comigo/shared-types";

export { MAX_COMPARATIVO_DEPUTADOS, MIN_COMPARATIVO_DEPUTADOS };

export type ComparativoDeputadosHref = `/deputados/comparativo/${string}`;

type SelecionavelParaComparativo = { externalIdDeputado: number };

export function toggleComparativoDeputado<
  TDeputado extends SelecionavelParaComparativo,
>(
  selecionados: readonly TDeputado[],
  deputado: TDeputado,
): readonly TDeputado[] {
  const isSelected = selecionados.some(
    (selecionado) =>
      selecionado.externalIdDeputado === deputado.externalIdDeputado,
  );
  if (isSelected) {
    return selecionados.filter(
      (selecionado) =>
        selecionado.externalIdDeputado !== deputado.externalIdDeputado,
    );
  }

  if (selecionados.length >= MAX_COMPARATIVO_DEPUTADOS) {
    return selecionados;
  }

  return [...selecionados, deputado];
}

export function canOpenComparativo(
  selecionados: readonly SelecionavelParaComparativo[],
): boolean {
  return (
    selecionados.length >= MIN_COMPARATIVO_DEPUTADOS &&
    selecionados.length <= MAX_COMPARATIVO_DEPUTADOS
  );
}

export function hasComparativoDeputadoLimit(
  selecionados: readonly SelecionavelParaComparativo[],
): boolean {
  return selecionados.length >= MAX_COMPARATIVO_DEPUTADOS;
}

export function parseComparativoDeputadosIds(segment: string): number[] | null {
  let decodedSegment: string;
  try {
    decodedSegment = decodeURIComponent(segment);
  } catch {
    return null;
  }

  const externalIdsDeputado = decodedSegment.split(",").map(Number);
  if (
    externalIdsDeputado.length < MIN_COMPARATIVO_DEPUTADOS ||
    externalIdsDeputado.length > MAX_COMPARATIVO_DEPUTADOS ||
    new Set(externalIdsDeputado).size !== externalIdsDeputado.length ||
    externalIdsDeputado.some((id) => !Number.isInteger(id) || id <= 0)
  ) {
    return null;
  }

  return externalIdsDeputado;
}

export function toComparativoDeputadosSegment(
  externalIdsDeputado: readonly number[],
): string {
  return externalIdsDeputado.join(",");
}

export function buildComparativoDeputadosHref(
  externalIdsDeputado: readonly number[],
): ComparativoDeputadosHref {
  return `/deputados/comparativo/${toComparativoDeputadosSegment(externalIdsDeputado)}`;
}
