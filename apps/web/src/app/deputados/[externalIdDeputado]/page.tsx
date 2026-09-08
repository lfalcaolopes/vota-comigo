import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import { NotFoundError } from "@/shared/lib/api-client";
import {
  DeputadoBreadcrumb,
  DeputadoPerfil,
  buildDeputadoHref,
  buildDeputadoJsonLd,
  nomePublicoLabel,
  parseDeputadoPerfilYear,
  parseExternalIdDeputado,
  perfil,
} from "@/shared/deputado";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ externalIdDeputado: string }>;
  searchParams: Promise<{ year?: string | string[] }>;
};

export async function generateMetadata({
  params,
  searchParams,
}: PageProps): Promise<Metadata> {
  const [{ externalIdDeputado: segment }, { year }] = await Promise.all([
    params,
    searchParams,
  ]);
  const externalIdDeputado = parseExternalIdDeputado(segment);
  if (externalIdDeputado === null) notFound();

  try {
    const deputado = await perfil(externalIdDeputado);
    const nome = nomePublicoLabel(deputado);
    const siglaPartido = deputado.snapshotPublico?.siglaPartido;
    const siglaUf = deputado.snapshotPublico?.siglaUf;
    const identificacao = [siglaPartido, siglaUf].filter(Boolean).join("-");
    const title = `${nome}${identificacao ? ` (${identificacao})` : ""} · ${externalIdDeputado}`;
    const description = `Veja a presença de ${nome} em votações nominais, o histórico partidário, as proposições assinadas e os gastos da cota parlamentar. Perfil ${externalIdDeputado} com dados oficiais da Câmara dos Deputados.`;
    const canonical = buildDeputadoHref(externalIdDeputado, nome);
    if (`/deputados/${segment}` !== canonical) {
      permanentRedirect(buildRedirectHref(canonical, year));
    }

    return {
      title,
      description,
      alternates: { canonical },
      openGraph: {
        type: "profile",
        locale: "pt_BR",
        title,
        description,
        url: canonical,
      },
    };
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }
}

function buildRedirectHref(
  canonicalPath: string,
  year: string | string[] | undefined,
): string {
  const query = new URLSearchParams();
  const selectedYear = Array.isArray(year) ? year[0] : year;
  if (selectedYear !== undefined) query.set("year", selectedYear);
  return `${canonicalPath}${query.size > 0 ? `?${query}` : ""}`;
}

export default async function DeputadoPerfilPage({
  params,
  searchParams,
}: PageProps) {
  const [{ externalIdDeputado: segment }, { year }] = await Promise.all([
    params,
    searchParams,
  ]);
  const externalIdDeputado = parseExternalIdDeputado(segment);
  if (externalIdDeputado === null) notFound();

  let deputado;
  try {
    deputado = await perfil(externalIdDeputado);
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound();
    }
    throw error;
  }

  const nome = nomePublicoLabel(deputado);
  const canonicalPath = buildDeputadoHref(externalIdDeputado, nome);
  if (`/deputados/${segment}` !== canonicalPath) {
    permanentRedirect(buildRedirectHref(canonicalPath, year));
  }

  const initialYear = parseDeputadoPerfilYear(
    year,
    deputado.defaultYear,
    deputado.validYearRange,
  );
  const jsonLd = buildDeputadoJsonLd(deputado);

  return (
    <main className="min-h-screen w-full min-w-0 overflow-x-hidden bg-bg text-ink">
      <div className="mx-auto grid w-full min-w-0 max-w-256 gap-8 px-4 pt-8 pb-16 md:pt-12">
        <DeputadoBreadcrumb perfil={deputado} />
        <DeputadoPerfil initialYear={initialYear} perfil={deputado} />
        <script
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
          }}
          type="application/ld+json"
        />
      </div>
    </main>
  );
}
