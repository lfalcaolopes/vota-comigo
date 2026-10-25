import { loadApuracaoSnapshot } from "@/features/apuracao";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET() {
  try {
    const snapshot = await loadApuracaoSnapshot();
    return Response.json(snapshot, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=60",
      },
    });
  } catch {
    return Response.json(
      { error: "Não foi possível ler a apuração do TSE agora." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
