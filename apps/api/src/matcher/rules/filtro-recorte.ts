import type { AlertaMatcher, DeputadoSexo } from '@vota-comigo/shared-types';

export function filtrarPorPartido<T extends { partido: string | null }>(
  deputados: readonly T[],
  partidos: readonly string[],
): readonly T[] {
  if (partidos.length === 0) return deputados;

  // As siglas chegam da query string, onde o usuário pode reescrevê-las.
  const selecionados = new Set(partidos.map((sigla) => sigla.toUpperCase()));
  return deputados.filter(
    (d) => d.partido !== null && selecionados.has(d.partido.toUpperCase()),
  );
}

export function filtrarPorAmostraPequena<
  T extends { alertas: readonly AlertaMatcher[] },
>(deputados: readonly T[], ocultarAmostraPequena: boolean): readonly T[] {
  return ocultarAmostraPequena
    ? deputados.filter((d) => !d.alertas.includes('amostra_pequena'))
    : deputados;
}

export function filtrarPorSexo<T extends { siglaSexo: string | null }>(
  deputados: readonly T[],
  sexo: DeputadoSexo | null,
): readonly T[] {
  if (sexo === null) return deputados;

  return deputados.filter(
    (d) => d.siglaSexo !== null && d.siglaSexo.toUpperCase() === sexo,
  );
}
