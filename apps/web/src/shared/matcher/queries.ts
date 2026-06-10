import type {
  MatcherExecucaoRequest,
  MatcherResultado,
} from "@vota-comigo/shared-types";

import { apiPost } from "@/shared/lib/api-client";

type Pagination = {
  limit?: number;
  offset?: number;
};

export function runMatcher(
  request: MatcherExecucaoRequest,
  { limit = 20, offset = 0 }: Pagination = {},
): Promise<MatcherResultado> {
  return apiPost<MatcherResultado>(
    `/matcher?limit=${limit}&offset=${offset}`,
    request,
  );
}
