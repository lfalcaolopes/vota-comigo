import type { FeedOrdenacao } from "@vota-comigo/shared-types";
import { SegmentedControl } from "@/shared/ui";
import { joinClassNames } from "@/shared/ui/utils";

import { ORDENACAO_LABEL } from "./feed-filtros";

const ITEMS = Object.entries(ORDENACAO_LABEL).map(([id, label]) => ({
  id,
  label,
}));

type FeedOrdenacaoControlProps = {
  className?: string;
  disabled?: boolean;
  itemClassName?: string;
  value: FeedOrdenacao;
  onChange: (value: FeedOrdenacao) => void;
};

export function FeedOrdenacaoControl({
  className,
  disabled = false,
  itemClassName,
  value,
  onChange,
}: FeedOrdenacaoControlProps) {
  return (
    <SegmentedControl
      activeId={value}
      className={joinClassNames("h-11 flex-nowrap", className)}
      disabled={disabled}
      itemClassName={joinClassNames("h-full !min-h-0", itemClassName)}
      items={ITEMS}
      label="Ordenação"
      onSelect={(id) => onChange(id as FeedOrdenacao)}
    />
  );
}
