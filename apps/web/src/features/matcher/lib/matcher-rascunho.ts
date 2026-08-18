import {
  MAX_POSICOES,
  escopoMatcherEnum,
  posicaoComputavelMatcherEnum,
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
  escopo: EscopoMatcher;
  selected: ProposicaoCard[];
  posicoes: Map<number, PosicaoUsuarioMatcher>;
  externalIdProposicoesFiltroConcordancia: number[];
};

export function hasRascunhoEntries(rascunho: MatcherRascunho): boolean {
  return (
    rascunho.siglaUf !== null ||
    rascunho.escopo !== "estadual" ||
    rascunho.selected.length > 0 ||
    rascunho.posicoes.size > 0 ||
    rascunho.externalIdProposicoesFiltroConcordancia.length > 0
  );
}

// Versão 2 removeu `cidade`; como o schema é estrito, um rascunho da versão 1
// seria rejeitado de qualquer forma, e a versão nova torna isso explícito.
const CURRENT_VERSION = 2 as const;

const serializedRascunhoSchema = z
  .object({
    version: z.literal(CURRENT_VERSION),
    siglaUf: siglaUfEnum.nullable(),
    escopo: escopoMatcherEnum,
    selected: z.array(proposicaoCardSchema).max(MAX_POSICOES),
    posicoes: z.array(posicaoMatcherSchema).max(MAX_POSICOES),
    externalIdProposicoesFiltroConcordancia: z
      .array(z.number().int().positive())
      .max(MAX_POSICOES)
      .default([]),
  })
  .strict()
  .superRefine((rascunho, context) => {
    const externalIdProposicoesComputaveis = new Set(
      rascunho.posicoes
        .filter(
          ({ posicao }) =>
            posicaoComputavelMatcherEnum.safeParse(posicao).success,
        )
        .map(({ externalIdProposicao }) => externalIdProposicao),
    );

    rascunho.externalIdProposicoesFiltroConcordancia.forEach(
      (externalIdProposicao, index) => {
        if (!externalIdProposicoesComputaveis.has(externalIdProposicao)) {
          context.addIssue({
            code: "custom",
            path: ["externalIdProposicoesFiltroConcordancia", index],
            message: `proposicao ausente das posicoes computaveis: ${externalIdProposicao}`,
          });
        }
      },
    );
  });

export function serializeRascunho(rascunho: MatcherRascunho): string {
  return JSON.stringify({
    version: CURRENT_VERSION,
    siglaUf: rascunho.siglaUf,
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
