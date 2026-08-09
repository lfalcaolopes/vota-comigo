import { MatcherComparativo } from "@/features/matcher";

type PageProps = {
  params: Promise<{ ids: string }>;
};

export default async function MatcherComparativoPage({ params }: PageProps) {
  const { ids } = await params;

  return <MatcherComparativo ids={ids} />;
}
