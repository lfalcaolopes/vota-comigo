import {
  MAX_POSICOES,
  escopoMatcherEnum,
  posicaoMatcherSchema,
  proposicaoCardSchema,
  siglaUfEnum,
} from "@vota-comigo/shared-types";
import type {
  EscopoMatcher,
  PosicaoUsuarioMatcher,
  ProposicaoCard,
  SiglaUf,
} from "@vota-comigo/shared-types";
import { z } from "zod";

export type MatcherRascunho = {
  siglaUf: SiglaUf | null;
  cidade: string;
  escopo: EscopoMatcher;
  selected: ProposicaoCard[];
  posicoes: Map<number, PosicaoUsuarioMatcher>;
  externalIdProposicoesFiltroConcordancia: number[];
};

export function hasRascunhoEntries(rascunho: MatcherRascunho): boolean {
  return (
    rascunho.siglaUf !== null ||
    rascunho.cidade.trim() !== "" ||
    rascunho.escopo !== "estadual" ||
    rascunho.selected.length > 0 ||
    rascunho.posicoes.size > 0 ||
    rascunho.externalIdProposicoesFiltroConcordancia.length > 0
  );
}

const CURRENT_VERSION = 1 as const;

const serializedRascunhoSchema = z
  .object({
    version: z.literal(CURRENT_VERSION),
    siglaUf: siglaUfEnum.nullable(),
    cidade: z.string().max(120),
    escopo: escopoMatcherEnum,
    selected: z.array(proposicaoCardSchema).max(MAX_POSICOES),
    posicoes: z.array(posicaoMatcherSchema).max(MAX_POSICOES),
    externalIdProposicoesFiltroConcordancia: z
      .array(z.number().int().positive())
      .max(MAX_POSICOES)
      .default([]),
  })
  .strict();

export function serializeRascunho(rascunho: MatcherRascunho): string {
  return JSON.stringify({
    version: CURRENT_VERSION,
    siglaUf: rascunho.siglaUf,
    cidade: rascunho.cidade,
    escopo: rascunho.escopo,
    selected: rascunho.selected,
    posicoes: [...rascunho.posicoes].map(([externalIdProposicao, posicao]) => ({
      externalIdProposicao,
      posicao,
    })),
    externalIdProposicoesFiltroConcordancia:
      rascunho.externalIdProposicoesFiltroConcordancia,
  });
}

export function parseRascunho(raw: string): MatcherRascunho | null {
  try {
    const result = serializedRascunhoSchema.safeParse(JSON.parse(raw));
    if (!result.success) return null;

    const { data } = result;
    return {
      siglaUf: data.siglaUf,
      cidade: data.cidade,
      escopo: data.escopo,
      selected: data.selected,
      posicoes: new Map(
        data.posicoes.map(({ externalIdProposicao, posicao }) => [
          externalIdProposicao,
          posicao,
        ]),
      ),
      externalIdProposicoesFiltroConcordancia:
        data.externalIdProposicoesFiltroConcordancia,
    };
  } catch {
    return null;
  }
}
