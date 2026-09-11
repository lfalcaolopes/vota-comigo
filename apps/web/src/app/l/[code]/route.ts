import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { buildCampaignDestination } from "@/shared/analytics";

type RouteContext = {
  params: Promise<{ code: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { code } = await context.params;
  const destination = buildCampaignDestination(request.nextUrl, code);

  if (destination === null) {
    return new Response("Link curto não encontrado.", { status: 404 });
  }

  const response = NextResponse.redirect(destination, 307);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
