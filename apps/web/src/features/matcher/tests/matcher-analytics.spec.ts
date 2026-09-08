import type { ProposicaoCard } from "@vota-comigo/shared-types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const track = vi.fn();
const apiPost = vi.fn();
const readFirstTouchAttribution = vi.fn();

vi.mock("@vercel/analytics", () => ({
  track: (...args: unknown[]) => track(...args),
}));
vi.mock("@/shared/lib/api-client", () => ({
  apiPost: (...args: unknown[]) => apiPost(...args),
}));
vi.mock("@/shared/analytics", () => ({
  readFirstTouchAttribution: () => readFirstTouchAttribution(),
}));

import {
  buildCompletionEvent,
  shouldTrackMatcherCompletion,
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
  readFirstTouchAttribution.mockReset();
  readFirstTouchAttribution.mockReturnValue({
    utmSource: null,
    utmMedium: null,
    utmCampaign: null,
    utmContent: null,
    referrer: null,
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("buildCompletionEvent", () => {
  describe("when counting selected and answered propostas", () => {
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
      expect(event).toEqual({
        totalSelecionadas: 3,
        totalRespondidas: 2,
        utmSource: null,
        utmMedium: null,
        utmCampaign: null,
        utmContent: null,
        referrer: null,
      });
    });

    it('counts "nao_sei" as an answered proposta', () => {
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

    it("ignores positions left over from de-selected propostas", () => {
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
      expect(event).toEqual({
        totalSelecionadas: 3,
        totalRespondidas: 0,
        utmSource: null,
        utmMedium: null,
        utmCampaign: null,
        utmContent: null,
        referrer: null,
      });
    });
  });
});

describe("trackMatcherStarted", () => {
  it('emits the "matcher_started" event and posts attribution to the API', () => {
    // Arrange
    const attribution = {
      utmSource: "whatsapp",
      utmMedium: "social",
      utmCampaign: null,
      utmContent: null,
      referrer: "https://example.com/origem",
    };
    readFirstTouchAttribution.mockReturnValue(attribution);

    // Act
    trackMatcherStarted();

    // Assert
    expect(track).toHaveBeenCalledWith("matcher_started");
    expect(apiPost).toHaveBeenCalledWith(
      "/analytics/matcher-start",
      attribution,
    );
  });
});

describe("trackMatcherCompleted", () => {
  it('emits "matcher_completed" with the event props and posts to the API', () => {
    // Arrange
    const event = {
      totalSelecionadas: 5,
      totalRespondidas: 4,
      utmSource: "whatsapp",
      utmMedium: "social",
      utmCampaign: "eleicoes",
      utmContent: null,
      referrer: "https://example.com/origem",
    };

    // Act
    trackMatcherCompleted(event);

    // Assert
    expect(track).toHaveBeenCalledWith("matcher_completed", {
      totalSelecionadas: 5,
      totalRespondidas: 4,
    });
    expect(apiPost).toHaveBeenCalledWith(
      "/analytics/matcher-completion",
      event,
    );
  });

  it("swallows an API rejection instead of throwing into the caller", async () => {
    // Arrange
    apiPost.mockRejectedValue(new Error("api down"));
    const event = {
      totalSelecionadas: 5,
      totalRespondidas: 4,
      utmSource: null,
      utmMedium: null,
      utmCampaign: null,
      utmContent: null,
      referrer: null,
    };

    // Act / Assert
    expect(() => trackMatcherCompleted(event)).not.toThrow();
    await Promise.resolve();
  });
});

describe("matcher completion tracking", () => {
  function completedState(): MatcherState {
    const selected = [card(1), card(2), card(3)].reduce(
      (state, proposicao) =>
        matcherReducer(state, { type: "toggleProposicao", proposicao }),
      initMatcherState([]),
    );
    const answered = [1, 2, 3].reduce(
      (state, externalIdProposicao) =>
        matcherReducer(state, {
          type: "setPosicao",
          externalIdProposicao,
          posicao: "aprovar",
        }),
      selected,
    );

    return matcherReducer(answered, {
      type: "runOk",
      escopo: "estadual",
      resultado: {
        siglaUf: "SP",
        totalProposicoesSelecionadas: 3,
        totalPosicoesComputaveis: 3,
        escopo: "estadual",
        deputados: [
          {
            externalIdDeputado: 10,
            nome: "Deputado 10",
            partido: "PP",
            siglaUf: "SP",
            urlFoto: null,
            emAtividade: true,
            compatibilidadeBruta: 100,
            amostraComparavel: 3,
            scoreOrdenacaoPercentual: 100,
            alertas: [],
            usoCota: {
              status: "indisponivel",
              legislatura: null,
              motivo: "fonte-incompleta",
            },
          },
        ],
        totalDeputadosAvaliados: 1,
        deputadosHistoricoIncompleto: 0,
        total: 1,
        limit: 20,
        offset: 0,
      },
    });
  }

  describe("when revisiting the result during the same matcher flow", () => {
    it("tracks the completion only on the first result visit", () => {
      // Arrange
      const result = completedState();

      // Act
      const firstVisit = shouldTrackMatcherCompletion(
        "/matcher/resultado",
        result,
      );
      const tracked = matcherReducer(result, { type: "trackCompletion" });
      const comparisonVisit = shouldTrackMatcherCompletion(
        "/matcher/comparativo/10,20",
        tracked,
      );
      const returnVisit = shouldTrackMatcherCompletion(
        "/matcher/resultado",
        tracked,
      );

      // Assert
      expect(firstVisit).toBe(true);
      expect(comparisonVisit).toBe(false);
      expect(returnVisit).toBe(false);
    });
  });

  describe("when starting another matcher flow", () => {
    it("allows the new flow to track its own completion", () => {
      // Arrange
      const tracked = matcherReducer(completedState(), {
        type: "trackCompletion",
      });

      // Act
      const reset = matcherReducer(tracked, { type: "resetMatcher" });
      const nextResult = completedState();

      // Assert
      expect(reset.hasTrackedCompletion).toBe(false);
      expect(
        shouldTrackMatcherCompletion("/matcher/resultado", nextResult),
      ).toBe(true);
    });
  });
});
