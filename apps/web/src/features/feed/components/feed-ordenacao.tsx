import type { FeedOrdenacao } from "@/shared/proposicao";
import { SegmentedControl } from "@/shared/ui";

const ITEMS = [
  { id: "mais-votadas", label: "Mais votadas" },
  { id: "mais-recentes", label: "Mais recentes" },
];

type FeedOrdenacaoProps = {
  value: FeedOrdenacao;
  onChange: (value: FeedOrdenacao) => void;
};

export function FeedOrdenacao({ value, onChange }: FeedOrdenacaoProps) {
  return (
    <SegmentedControl
      activeId={value}
      items={ITEMS}
      label="Ordenação"
      onSelect={(id) => onChange(id as FeedOrdenacao)}
    />
  );
}
