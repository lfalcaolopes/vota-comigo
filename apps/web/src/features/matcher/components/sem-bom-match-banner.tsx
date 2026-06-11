import { InlineMessage } from "@/shared/ui";

import {
  SEM_BOM_MATCH_BANNER_BODY,
  SEM_BOM_MATCH_BANNER_TITLE,
} from "../lib/matcher-presentation";

export function SemBomMatchBanner() {
  return (
    <InlineMessage
      body={SEM_BOM_MATCH_BANNER_BODY}
      title={SEM_BOM_MATCH_BANNER_TITLE}
      tone="warning"
    />
  );
}
