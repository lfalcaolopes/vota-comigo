import { MatcherPosicoes } from "@/features/matcher";

export default async function MatcherPosicoesPage({
  params,
}: {
  params: Promise<{ segment: string }>;
}) {
  const { segment } = await params;

  return <MatcherPosicoes segment={segment} />;
}
