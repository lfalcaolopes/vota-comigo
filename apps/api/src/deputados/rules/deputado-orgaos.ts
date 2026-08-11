import type { DeputadoOrgao } from '@vota-comigo/shared-types';
import { z } from 'zod';

const sourceDateSchema = z.string().refine(isValidSourceDate);

const sourceSchema = z.object({
  idOrgao: z.number().int().positive(),
  uriOrgao: z.string().optional().nullable(),
  siglaOrgao: z.string().optional().nullable(),
  nomeOrgao: z.string().optional().nullable(),
  nomePublicacao: z.string().optional().nullable(),
  titulo: z.string().trim().min(1),
  codTitulo: z.union([z.string(), z.number()]).optional().nullable(),
  dataInicio: sourceDateSchema,
  dataFim: sourceDateSchema.optional().nullable(),
});

export type DeriveDeputadoOrgaosResult =
  | { ok: true; items: readonly DeputadoOrgao[] }
  | { ok: false; invalidItemIndex: number };

export function deriveDeputadoOrgaos(
  source: readonly unknown[],
): DeriveDeputadoOrgaosResult {
  const items: DeputadoOrgao[] = [];

  for (const [index, raw] of source.entries()) {
    const parsed = sourceSchema.safeParse(raw);
    if (!parsed.success) {
      return { ok: false, invalidItemIndex: index };
    }

    const nome =
      parsed.data.nomePublicacao?.trim() || parsed.data.nomeOrgao?.trim();
    if (nome === undefined || nome === '') {
      return { ok: false, invalidItemIndex: index };
    }

    items.push({
      externalIdOrgao: parsed.data.idOrgao,
      siglaOrgao: parsed.data.siglaOrgao?.trim() || null,
      nome,
      titulo: parsed.data.titulo.trim(),
      dataInicio: toIsoDate(parsed.data.dataInicio),
      dataFim:
        parsed.data.dataFim === null || parsed.data.dataFim === undefined
          ? null
          : toIsoDate(parsed.data.dataFim),
    });
  }

  return { ok: true, items: items.sort(compareOrgaos) };
}

function compareOrgaos(left: DeputadoOrgao, right: DeputadoOrgao): number {
  const groupDifference =
    getPresentationGroup(left.titulo) - getPresentationGroup(right.titulo);
  if (groupDifference !== 0) return groupDifference;

  const dateDifference = right.dataInicio.localeCompare(left.dataInicio);
  if (dateDifference !== 0) return dateDifference;

  const nameDifference = left.nome.localeCompare(right.nome, 'pt-BR');
  if (nameDifference !== 0) return nameDifference;

  return left.externalIdOrgao - right.externalIdOrgao;
}

function getPresentationGroup(titulo: string): number {
  const normalized = titulo
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase('pt-BR');

  if (normalized.includes('presidente')) return 0;
  if (normalized === 'titular') return 1;
  if (normalized === 'suplente') return 2;
  return 3;
}

function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value
  );
}

function isValidSourceDate(value: string): boolean {
  const match =
    /^(\d{4}-\d{2}-\d{2})(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})?)?$/.exec(
      value,
    );
  return match !== null && isValidIsoDate(match[1]);
}

function toIsoDate(value: string): string {
  return value.slice(0, 10);
}
