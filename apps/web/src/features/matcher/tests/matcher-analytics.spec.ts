import type { ProposicaoCard } from "@vota-comigo/shared-types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const track = vi.fn();
const apiPost = vi.fn();

vi.mock("@vercel/analytics", () => ({
  track: (...args: unknown[]) => track(...args),
}));
vi.mock("@/shared/lib/api-client", () => ({
  apiPost: (...args: unknown[]) => apiPost(...args),
}));

import {
  buildCompletionEvent,
  trackMatcherCompleted,
  trackMatcherStarted,
} from "../lib/matcher-analytics";
import {
  initMatcherState,
  matcherReducer,
  type MatcherState,
} from "../lib/matcher-state";

function card(externalIdProposicao: number): ProposicaoCard {
  return {
    externalIdProposicao,
    siglaTipo: "PL",
    numero: externalIdProposicao,
    ano: 2023,
    ementa: "Dispõe sobre alguma coisa.",
    resumoIaDisponivel: false,
    resumoIaCard: null,
    dataApresentacao: "2023-05-10",
    volumeVotacoesPlenario: 9,
    dataUltimaVotacao: "2025-03-14",
  };
}

function stateWith(actions: (s: MatcherState) => MatcherState): MatcherState {
  return actions(initMatcherState([]));
}

beforeEach(() => {
  track.mockReset();
  apiPost.mockReset();
  apiPost.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("buildCompletionEvent", () => {
  describe("when counting selected and answered proposições", () => {
    it("reports the selected count and the answered count", () => {
      // Arrange
      const state = stateWith((s) =>
        [card(1), card(2), card(3)].reduce(
          (acc, proposicao) =>
            matcherReducer(acc, { type: "toggleProposicao", proposicao }),
          s,
        ),
      );
      const answered = matcherReducer(
        matcherReducer(state, {
          type: "setPosicao",
          externalIdProposicao: 1,
          posicao: "aprovar",
        }),
        { type: "setPosicao", externalIdProposicao: 2, posicao: "rejeitar" },
      );

      // Act
      const event = buildCompletionEvent(answered);

      // Assert
      expect(event).toEqual({ totalSelecionadas: 3, totalRespondidas: 2 });
    });

    it('counts "nao_sei" as an answered proposição', () => {
      // Arrange
      const selected = stateWith((s) =>
        [card(1), card(2), card(3)].reduce(
          (acc, proposicao) =>
            matcherReducer(acc, { type: "toggleProposicao", proposicao }),
          s,
        ),
      );
      const answered = matcherReducer(selected, {
        type: "setPosicao",
        externalIdProposicao: 1,
        posicao: "nao_sei",
      });

      // Act
      const event = buildCompletionEvent(answered);

      // Assert
      expect(event.totalRespondidas).toBe(1);
    });

    it("ignores positions left over from de-selected proposições", () => {
      // Arrange
      const selected = stateWith((s) =>
        [card(1), card(2), card(3)].reduce(
          (acc, proposicao) =>
            matcherReducer(acc, { type: "toggleProposicao", proposicao }),
          s,
        ),
      );
      const withStrayPosicao = matcherReducer(selected, {
        type: "setPosicao",
        externalIdProposicao: 99,
        posicao: "aprovar",
      });

      // Act
      const event = buildCompletionEvent(withStrayPosicao);

      // Assert
      expect(event).toEqual({ totalSelecionadas: 3, totalRespondidas: 0 });
    });
  });
});

describe("trackMatcherStarted", () => {
  it('emits the "matcher_started" Vercel event', () => {
    // Act
    trackMatcherStarted();

    // Assert
    expect(track).toHaveBeenCalledWith("matcher_started");
  });
});

describe("trackMatcherCompleted", () => {
  it('emits "matcher_completed" with the event props and posts to the API', () => {
    // Arrange
    const event = { totalSelecionadas: 5, totalRespondidas: 4 };

    // Act
    trackMatcherCompleted(event);

    // Assert
    expect(track).toHaveBeenCalledWith("matcher_completed", { ...event });
    expect(apiPost).toHaveBeenCalledWith(
      "/analytics/matcher-completion",
      event,
    );
  });

  it("swallows an API rejection instead of throwing into the caller", async () => {
    // Arrange
    apiPost.mockRejectedValue(new Error("api down"));
    const event = { totalSelecionadas: 5, totalRespondidas: 4 };

    // Act / Assert
    expect(() => trackMatcherCompleted(event)).not.toThrow();
    await Promise.resolve();
  });
});
