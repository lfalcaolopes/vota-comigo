import { ButtonLink, EmptyState } from "@/shared/ui";

export default function NotFound() {
  return (
    <main className="min-h-screen w-full min-w-0 overflow-x-hidden bg-bg text-ink">
      <div className="mx-auto grid w-full min-w-0 max-w-200 gap-8 px-4 pt-8 pb-16 md:pt-12">
        <EmptyState
          action={<ButtonLink href="/">Voltar para o início</ButtonLink>}
          body="Este endereço não existe no Quem Vota Comigo."
          title="Página não encontrada"
        />
      </div>
    </main>
  );
}
