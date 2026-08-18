import type {
  DeputadoDiscurso,
  DeputadoDiscursoLink,
} from '@vota-comigo/shared-types';
import { z } from 'zod';

const externalUrlSchema = z.url().refine(isExternalHttpUrl);

const sourceSchema = z.object({
  dataHoraInicio: z.string().refine(isValidSourceDateTime),
  tipoDiscurso: z.string().trim().min(1),
  faseEvento: z
    .object({ titulo: z.string().trim().min(1) })
    .optional()
    .nullable(),
  sumario: z.string().optional().nullable(),
  keywords: z.string().optional().nullable(),
  transcricao: z.string().optional().nullable(),
  urlVideo: externalUrlSchema.optional().nullable(),
  urlAudio: externalUrlSchema.optional().nullable(),
  urlTexto: externalUrlSchema.optional().nullable(),
});

function isExternalHttpUrl(value: string): boolean {
  try {
    const protocol = new URL(value).protocol;
    return protocol === 'https:' || protocol === 'http:';
  } catch {
    return false;
  }
}

function isValidSourceDateTime(value: string): boolean {
  const match =
    /^(\d{4}-\d{2}-\d{2})T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})?$/.exec(
      value,
    );
  if (match === null) return false;

  const date = new Date(`${match[1]}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.valueOf()) &&
    date.toISOString().slice(0, 10) === match[1]
  );
}

export type DeriveDeputadoDiscursosResult =
  | { ok: true; items: readonly DeputadoDiscurso[] }
  | { ok: false; invalidItemIndex: number };

export function deriveDeputadoDiscursos(
  source: readonly unknown[],
): DeriveDeputadoDiscursosResult {
  const items: DeputadoDiscurso[] = [];

  for (const [index, raw] of source.entries()) {
    const parsed = sourceSchema.safeParse(raw);
    if (!parsed.success) {
      return { ok: false, invalidItemIndex: index };
    }

    const discurso = parsed.data;
    items.push({
      dataHoraInicio: discurso.dataHoraInicio,
      tipoDiscurso: discurso.tipoDiscurso,
      fase: discurso.faseEvento?.titulo ?? null,
      sumario: normalizeText(discurso.sumario),
      assuntos: toAssuntos(discurso.keywords),
      links: toLinks(discurso),
    });
  }

  return { ok: true, items };
}

function normalizeText(value: string | null | undefined): string | null {
  return value?.replace(/\s+/g, ' ').trim() || null;
}

function toAssuntos(keywords: string | null | undefined): string[] {
  const assuntos = (keywords ?? '')
    .split(/[,\n]/)
    .map((assunto) => assunto.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  return assuntos.filter((assunto) => {
    const key = assunto.toLocaleLowerCase('pt-BR');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function toLinks(source: z.infer<typeof sourceSchema>): DeputadoDiscursoLink[] {
  const links: DeputadoDiscursoLink[] = [];
  if (source.urlVideo) links.push({ kind: 'video', url: source.urlVideo });
  if (source.urlAudio) links.push({ kind: 'audio', url: source.urlAudio });
  if (source.urlTexto) links.push({ kind: 'text', url: source.urlTexto });
  return links;
}
