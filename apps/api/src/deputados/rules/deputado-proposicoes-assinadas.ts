import type { DeputadoProposicaoAssinada } from '@vota-comigo/shared-types';
import { z } from 'zod';

const CAMARA_FICHA_TRAMITACAO_URL =
  'https://www.camara.leg.br/proposicoesWeb/fichadetramitacao';

const sourceSchema = z.object({
  id: z.number().int().positive(),
  siglaTipo: z.string().optional().nullable(),
  numero: z.number().int().optional().nullable(),
  ano: z.number().int().optional().nullable(),
  ementa: z.string().optional().nullable(),
  dataApresentacao: z.string().refine(isValidSourceDateTime),
});

// A rota de busca da Câmara rejeita intervalos maiores que três meses.
const QUARTER_BOUNDARIES = [
  { start: '01-01', end: '03-31' },
  { start: '04-01', end: '06-30' },
  { start: '07-01', end: '09-30' },
  { start: '10-01', end: '12-31' },
] as const;

export type ProposicoesAssinadasQuarter = {
  start: string;
  end: string;
};

export function buildProposicoesAssinadasQuarters(
  year: number,
): readonly ProposicoesAssinadasQuarter[] {
  return QUARTER_BOUNDARIES.map((boundary) => ({
    start: `${year}-${boundary.start}`,
    end: `${year}-${boundary.end}`,
  }));
}

export type DeriveDeputadoProposicoesAssinadasResult =
  | { ok: true; items: readonly DeputadoProposicaoAssinada[] }
  | { ok: false; invalidItemIndex: number };

export function deriveDeputadoProposicoesAssinadas(
  source: readonly unknown[],
  year: number,
): DeriveDeputadoProposicoesAssinadasResult {
  const items: DeputadoProposicaoAssinada[] = [];
  const seenIds = new Set<number>();

  for (const [index, raw] of source.entries()) {
    const parsed = sourceSchema.safeParse(raw);
    if (!parsed.success) {
      return { ok: false, invalidItemIndex: index };
    }

    const proposicao = parsed.data;
    const dataApresentacao = proposicao.dataApresentacao.slice(0, 10);
    if (!dataApresentacao.startsWith(`${year}-`)) {
      return { ok: false, invalidItemIndex: index };
    }

    if (seenIds.has(proposicao.id)) continue;
    seenIds.add(proposicao.id);

    items.push({
      externalIdProposicao: proposicao.id,
      siglaTipo: proposicao.siglaTipo?.trim() || null,
      numero: toPositiveInteger(proposicao.numero),
      ano: toPositiveInteger(proposicao.ano),
      ementa: proposicao.ementa?.trim() || null,
      dataApresentacao,
      urlOficial: `${CAMARA_FICHA_TRAMITACAO_URL}?idProposicao=${proposicao.id}`,
    });
  }

  return { ok: true, items: items.sort(compareProposicoesAssinadas) };
}

function compareProposicoesAssinadas(
  left: DeputadoProposicaoAssinada,
  right: DeputadoProposicaoAssinada,
): number {
  const dateDifference = right.dataApresentacao.localeCompare(
    left.dataApresentacao,
  );
  if (dateDifference !== 0) return dateDifference;

  return right.externalIdProposicao - left.externalIdProposicao;
}

function toPositiveInteger(value: number | null | undefined): number | null {
  return value !== null && value !== undefined && value > 0 ? value : null;
}

function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value
  );
}

function isValidSourceDateTime(value: string): boolean {
  const match =
    /^(\d{4}-\d{2}-\d{2})(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})?)?$/.exec(
      value,
    );
  return match !== null && isValidIsoDate(match[1]);
}
