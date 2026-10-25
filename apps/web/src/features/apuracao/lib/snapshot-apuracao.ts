import type { ApuracaoSnapshotEvent } from "@vota-comigo/shared-types";
import { APURACAO_SNAPSHOT_STEP } from "@vota-comigo/shared-types";

import type { ApuracaoSnapshot } from "./tse-apuracao";
import { SEGUNDO_TURNO } from "./tse-apuracao";

// Per warm instance; the API's unique (eleição, step) key dedupes across instances.
let lastSavedStep = 0;

export function toUrnasStep(urnasApuradas: number): number {
  return (
    Math.floor(urnasApuradas / APURACAO_SNAPSHOT_STEP) * APURACAO_SNAPSHOT_STEP
  );
}

export function toSnapshotEvent(
  snapshot: ApuracaoSnapshot,
): ApuracaoSnapshotEvent | null {
  const urnasStep = toUrnasStep(snapshot.urnasApuradas);
  if (urnasStep < APURACAO_SNAPSHOT_STEP) return null;
  return {
    externalCdEleicao: SEGUNDO_TURNO,
    urnasStep,
    urnasApuradas: snapshot.urnasApuradas,
    numeroA: snapshot.candidatoA.numero,
    numeroB: snapshot.candidatoB.numero,
    oficialShareA: snapshot.oficialShareA,
    projecaoShareA: snapshot.projecao.shareA,
    tseUpdatedAt: snapshot.tseUpdatedAt,
    source: "site",
  };
}

export async function recordApuracaoSnapshot(
  snapshot: ApuracaoSnapshot,
): Promise<void> {
  const event = toSnapshotEvent(snapshot);
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  const token = process.env.APURACAO_SNAPSHOT_TOKEN;
  if (!event || event.urnasStep <= lastSavedStep || !apiBaseUrl || !token) {
    return;
  }

  const response = await fetch(`${apiBaseUrl}/apuracao/snapshots`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-apuracao-token": token,
    },
    body: JSON.stringify(event),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (response.ok) lastSavedStep = event.urnasStep;
}
