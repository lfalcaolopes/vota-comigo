import type { FeedOrdenacao } from "@vota-comigo/shared-types";
import { SegmentedControl } from "@/shared/ui";
import { joinClassNames } from "@/shared/ui/utils";

const ITEMS = [
  { id: "mais-votadas", label: "Mais votadas" },
  { id: "mais-recentes", label: "Mais recentes" },
];

type FeedOrdenacaoControlProps = {
  className?: string;
  itemClassName?: string;
  value: FeedOrdenacao;
  onChange: (value: FeedOrdenacao) => void;
};

export function FeedOrdenacaoControl({
  className,
  itemClassName,
  value,
  onChange,
}: FeedOrdenacaoControlProps) {
  return (
    <SegmentedControl
      activeId={value}
      className={joinClassNames("h-11 flex-nowrap", className)}
      itemClassName={joinClassNames("h-full !min-h-0", itemClassName)}
      items={ITEMS}
      label="Ordenação"
      onSelect={(id) => onChange(id as FeedOrdenacao)}
    />
  );
}
