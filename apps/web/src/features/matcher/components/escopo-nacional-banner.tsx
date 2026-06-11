import type { EscopoMatcher } from "@vota-comigo/shared-types";

import { Button, InlineMessage } from "@/shared/ui";

import {
  ESCOPO_NACIONAL_BANNER_BODY,
  ESCOPO_NACIONAL_BANNER_TITLE,
} from "../lib/matcher-presentation";

type EscopoNacionalBannerProps = {
  onEscopoChange: (escopo: EscopoMatcher) => void;
};

export function EscopoNacionalBanner({ onEscopoChange }: EscopoNacionalBannerProps) {
  return (
    <div className="grid gap-3">
      <InlineMessage
        body={ESCOPO_NACIONAL_BANNER_BODY}
        title={ESCOPO_NACIONAL_BANNER_TITLE}
        tone="neutral"
      />
      <Button
        className="justify-self-start"
        onClick={() => onEscopoChange("nacional")}
        variant="primary"
      >
        Ver todos os deputados (Brasil)
      </Button>
    </div>
  );
}
