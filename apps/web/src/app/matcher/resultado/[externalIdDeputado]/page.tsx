import { MatcherResultadoDetalhe } from "@/features/matcher";

type PageProps = {
  params: Promise<{ externalIdDeputado: string }>;
};

export default async function MatcherResultadoDetalhePage({
  params,
}: PageProps) {
  const { externalIdDeputado } = await params;

  return (
    <MatcherResultadoDetalhe externalIdDeputado={Number(externalIdDeputado)} />
  );
}
