import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  buildDeputadoHref,
  nomePublicoLabel,
  parseExternalIdDeputado,
  perfil,
} from "@/shared/deputado";

export async function proxy(request: NextRequest) {
  const segment = request.nextUrl.pathname.slice("/deputados/".length);
  const externalIdDeputado = parseExternalIdDeputado(segment);
  if (externalIdDeputado === null) return NextResponse.next();

  try {
    const deputado = await perfil(externalIdDeputado);
    const canonicalPath = buildDeputadoHref(
      externalIdDeputado,
      nomePublicoLabel(deputado),
    );
    if (request.nextUrl.pathname === canonicalPath) return NextResponse.next();

    const destination = request.nextUrl.clone();
    destination.pathname = canonicalPath;
    return NextResponse.redirect(destination, 308);
  } catch {
    return NextResponse.next();
  }
}

export const config = {
  matcher: "/deputados/:segment",
};
