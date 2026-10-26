import projecaoSnapshotsData from "../data/projecao-snapshots-2026.json";
import { formatPontos, formatUrnas } from "./apuracao-presentation";

export type ProjecaoSnapshot = {
  urnasApuradas: number;
  oficialShareA: number;
  projecaoShareA: number;
  tseUpdatedAt: string;
};

export type SnapshotSeries = "oficialShareA" | "projecaoShareA";

export const projecaoSnapshots: ProjecaoSnapshot[] = projecaoSnapshotsData;

export function findStableFrom(
  snapshots: ProjecaoSnapshot[],
  series: SnapshotSeries,
  finalShareA: number,
  tolerance: number,
): number | null {
  let stableFrom: number | null = null;
  for (const snapshot of snapshots) {
    const isWithin = Math.abs(snapshot[series] - finalShareA) <= tolerance;
    if (!isWithin) stableFrom = null;
    else stableFrom ??= snapshot.urnasApuradas;
  }
  return stableFrom;
}

export function findLiderContrario(
  snapshots: ProjecaoSnapshot[],
  series: SnapshotSeries,
  finalShareA: number,
): { from: number; to: number } | null {
  const isVencedorA = finalShareA >= 0.5;
  const contrarios = snapshots.filter(
    (snapshot) => snapshot[series] >= 0.5 !== isVencedorA,
  );
  if (contrarios.length === 0) return null;
  return {
    from: contrarios[0].urnasApuradas,
    to: contrarios[contrarios.length - 1].urnasApuradas,
  };
}

export function describeProjecaoHistory(
  snapshots: ProjecaoSnapshot[],
  finalShareA: number,
  tolerance: number,
  nomeA: string,
  nomeB: string,
): { projecao: string; oficial: string } {
  const distancia = formatPontos(tolerance * 100);
  const first = snapshots[0]?.urnasApuradas;
  const projecaoFrom = findStableFrom(
    snapshots,
    "projecaoShareA",
    finalShareA,
    tolerance,
  );
  const oficialFrom = findStableFrom(
    snapshots,
    "oficialShareA",
    finalShareA,
    tolerance,
  );
  const contrario = findLiderContrario(snapshots, "oficialShareA", finalShareA);
  const perdedor = finalShareA >= 0.5 ? nomeB : nomeA;

  const projecao =
    projecaoFrom === null
      ? `A projeção não chegou a ficar a menos de ${distancia} do resultado final.`
      : projecaoFrom === first
        ? `A projeção ficou a menos de ${distancia} do resultado final desde a primeira parcial gravada, com ${formatUrnas(projecaoFrom)} das urnas.`
        : `A projeção ficou a menos de ${distancia} do resultado final a partir de ${formatUrnas(projecaoFrom)} das urnas.`;

  const oficialAlcance =
    oficialFrom === null
      ? "A parcial oficial não chegou a essa distância antes da última parcial gravada"
      : `A parcial oficial ${oficialFrom > (projecaoFrom ?? 100) ? "só " : ""}chegou a essa distância com ${formatUrnas(oficialFrom)} das urnas`;
  const oficial = contrario
    ? `${oficialAlcance}, e entre ${formatUrnas(contrario.from)} e ${formatUrnas(contrario.to)} das urnas mostrava ${perdedor} à frente.`
    : `${oficialAlcance}.`;

  return { projecao, oficial };
}
