import type { Metadata } from "next";

import { DeputadosDirectory, discovery } from "@/shared/deputado";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Diretório de deputados",
  description:
    "Lista completa dos perfis de deputados federais, agrupados pelo estado mais recente registrado na Câmara.",
};

export default async function DeputadosDiretorioPage() {
  const { items } = await discovery();

  return (
    <main className="min-h-screen w-full min-w-0 overflow-x-hidden bg-bg text-ink">
      <div className="mx-auto grid w-full min-w-0 max-w-5xl gap-8 px-4 pt-8 pb-16 md:pt-12">
        <header className="grid max-w-[68ch] gap-3">
          <h1 className="text-3xl leading-tight font-[720] tracking-[-0.02em] text-balance text-ink">
            Diretório de deputados
          </h1>
          <p className="text-base leading-normal text-muted">
            Todos os perfis disponíveis, agrupados pelo estado mais recente
            registrado na Câmara. Para buscar por nome ou filtrar por partido,
            sexo e idade, use a lista de deputados.
          </p>
        </header>

        <DeputadosDirectory deputados={items} />
      </div>
    </main>
  );
}
