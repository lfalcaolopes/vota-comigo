import { MatcherProposicoes } from "@/features/matcher";
import { feed, temasDisponiveis } from "@/shared/proposicao";

export const dynamic = "force-dynamic";

export default async function MatcherProposicoesPage() {
  const [{ items, total }, { items: temas }] = await Promise.all([
    feed(20, 0),
    temasDisponiveis(),
  ]);

  return (
    <MatcherProposicoes
      initialProposicoes={items}
      initialTotal={total}
      temas={temas}
    />
  );
}
