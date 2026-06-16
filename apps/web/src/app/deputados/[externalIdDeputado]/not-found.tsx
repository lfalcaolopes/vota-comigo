import { ButtonLink, EmptyState } from "@/shared/ui";

export default function DeputadoNotFound() {
  return (
    <main className="min-h-screen w-full min-w-0 overflow-x-hidden bg-bg text-ink">
      <div className="mx-auto grid w-full min-w-0 max-w-200 gap-8 px-4 pt-8 pb-16 md:pt-12">
        <EmptyState
          action={<ButtonLink href="/">Voltar para o início</ButtonLink>}
          body="Este endereço não corresponde a nenhum deputado do Quem Vota Comigo."
          title="Deputado não encontrado"
        />
      </div>
    </main>
  );
}
