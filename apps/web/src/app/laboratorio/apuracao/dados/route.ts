import { after } from "next/server";

import {
  loadApuracaoSnapshot,
  recordApuracaoSnapshot,
} from "@/features/apuracao";

export const dynamic = "force-dynamic";
export const maxDuration = 300;
export const preferredRegion = "gru1";

export async function GET() {
  try {
    const snapshot = await loadApuracaoSnapshot();
    after(() => recordApuracaoSnapshot(snapshot).catch(() => undefined));
    return Response.json(snapshot, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=60",
      },
    });
  } catch {
    return Response.json(
      { error: "Não foi possível ler a apuração do TSE agora." },
      // short CDN cache so a failing TSE is not hit by every visitor at once
      {
        status: 502,
        headers: { "Cache-Control": "public, s-maxage=15" },
      },
    );
  }
}
