import type { FeedOrdenacao } from "@vota-comigo/shared-types";
import { SegmentedControl } from "@/shared/ui";

const ITEMS = [
  { id: "mais-votadas", label: "Mais votadas" },
  { id: "mais-recentes", label: "Mais recentes" },
];

type FeedOrdenacaoControlProps = {
  value: FeedOrdenacao;
  onChange: (value: FeedOrdenacao) => void;
};

export function FeedOrdenacaoControl({ value, onChange }: FeedOrdenacaoControlProps) {
  return (
    <SegmentedControl
      activeId={value}
      items={ITEMS}
      label="Ordenação"
      onSelect={(id) => onChange(id as FeedOrdenacao)}
    />
  );
}
