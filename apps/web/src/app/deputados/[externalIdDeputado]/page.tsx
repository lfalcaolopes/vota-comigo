import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { NotFoundError } from "@/shared/lib/api-client";
import {
  DeputadoBreadcrumb,
  DeputadoPerfil,
  nomePublicoLabel,
  perfil,
} from "@/shared/deputado";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ externalIdDeputado: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { externalIdDeputado } = await params;

  try {
    const deputado = await perfil(Number(externalIdDeputado));
    return {
      title: nomePublicoLabel(deputado),
    };
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound();
    }
    return { title: "Deputado" };
  }
}

export default async function DeputadoPerfilPage({ params }: PageProps) {
  const { externalIdDeputado } = await params;

  let deputado;
  try {
    deputado = await perfil(Number(externalIdDeputado));
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound();
    }
    throw error;
  }

  return (
    <main className="min-h-screen w-full min-w-0 overflow-x-hidden bg-bg text-ink">
      <div className="mx-auto grid w-full min-w-0 max-w-256 gap-8 px-4 pt-8 pb-16 md:pt-12">
        <DeputadoBreadcrumb perfil={deputado} />
        <DeputadoPerfil perfil={deputado} />
      </div>
    </main>
  );
}
