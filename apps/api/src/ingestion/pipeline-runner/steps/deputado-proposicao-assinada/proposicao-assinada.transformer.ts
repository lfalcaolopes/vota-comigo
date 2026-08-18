import type { CsvRow } from '../../sources/csv-reader';
import type { Rejection } from '../../types/ingestion-pipeline-runner.types';

import type {
  ContadorAssinaturas,
  DeputadoProposicaoAssinadaRow,
  ProposicaoTipoRow,
} from './deputado-proposicao-assinada.repository.types';

// idProposicao -> deputadoId -> assina com ordemAssinatura = 1 em alguma linha.
export type PorProposicao = Map<number, Map<string, boolean>>;

export type DeputadoAcumulador = {
  dias: Map<string, ContadorAssinaturas>;
  tipos: Map<string, ContadorAssinaturas>;
};

// bucketYear (ano de dataApresentacao) -> deputadoId -> acumulador.
export type AssinaturaBuckets = Map<number, Map<string, DeputadoAcumulador>>;

export type TipoRegistro = {
  descricaoTipo: string | null;
  externalCodTipo: number | null;
};

export type TipoRegistry = Map<string, TipoRegistro>;

const TIPOS_EXCLUIDOS = new Set(['DOC', 'OF']);

export type CollectAssinaturasDoAnoResult = {
  porProposicao: PorProposicao;
  read: number;
  ignored: number;
};

export async function collectAssinaturasDoAno(input: {
  rows: AsyncIterable<CsvRow> | Iterable<CsvRow>;
  deputadoIds: ReadonlyMap<number, string>;
}): Promise<CollectAssinaturasDoAnoResult> {
  const porProposicao: PorProposicao = new Map();
  let read = 0;
  let ignored = 0;

  for await (const { record } of input.rows) {
    read += 1;

    const externalIdProposicao = toInteger(record.idProposicao);
    const externalIdDeputadoAutor = record.idDeputadoAutor?.trim();

    if (
      externalIdProposicao === null ||
      externalIdDeputadoAutor === undefined ||
      externalIdDeputadoAutor === ''
    ) {
      // Órgão, Senado ou outro autor institucional: fora do universo de
      // deputados que o produto modela.
      ignored += 1;
      continue;
    }

    const deputadoId = input.deputadoIds.get(Number(externalIdDeputadoAutor));

    if (deputadoId === undefined) {
      // Deputado fora do universo da ADR 003: ignorado, não é lacuna.
      ignored += 1;
      continue;
    }

    const primeiro = record.ordemAssinatura?.trim() === '1';
    const porDeputado =
      porProposicao.get(externalIdProposicao) ?? new Map<string, boolean>();

    // Deputado repetido na mesma proposição colapsa numa entrada: é o que
    // garante a contagem de proposições distintas.
    porDeputado.set(
      deputadoId,
      (porDeputado.get(deputadoId) ?? false) || primeiro,
    );
    porProposicao.set(externalIdProposicao, porDeputado);
  }

  return { porProposicao, read, ignored };
}

export type ApplyProposicoesAnoResult = {
  read: number;
  ignoredTipoExcluido: number;
  rejected: Rejection[];
};

export async function applyProposicoesAno(input: {
  rows: AsyncIterable<CsvRow> | Iterable<CsvRow>;
  sourceFile: string;
  // Mutado: entradas resolvidas nesta passagem são removidas.
  pendentes: PorProposicao;
  // Mutado: incrementado por esta passagem.
  buckets: AssinaturaBuckets;
  // Mutado: preenchido por esta passagem.
  tipos: TipoRegistry;
}): Promise<ApplyProposicoesAnoResult> {
  let read = 0;
  let ignoredTipoExcluido = 0;
  const rejected: Rejection[] = [];

  for await (const { lineNumber, record } of input.rows) {
    read += 1;

    const externalIdProposicao = toInteger(record.id);

    if (externalIdProposicao === null) {
      continue;
    }

    const assinantes = input.pendentes.get(externalIdProposicao);

    if (assinantes === undefined) {
      continue;
    }

    const siglaTipo = record.siglaTipo?.trim() ?? '';

    if (TIPOS_EXCLUIDOS.has(siglaTipo)) {
      ignoredTipoExcluido += assinantes.size;
      input.pendentes.delete(externalIdProposicao);
      continue;
    }

    const dataApresentacao = record.dataApresentacao?.trim() ?? '';

    if (!isValidDate(dataApresentacao)) {
      rejected.push({
        file: input.sourceFile,
        line: lineNumber,
        type: 'validacao_data_apresentacao_invalida',
        fields: {
          idProposicao: String(externalIdProposicao),
          dataApresentacao,
        },
        message:
          `dataApresentacao ausente ou malformada na linha ${lineNumber} de ` +
          `${input.sourceFile} para a proposição ${externalIdProposicao}.`,
      });
      input.pendentes.delete(externalIdProposicao);
      continue;
    }

    input.tipos.set(siglaTipo, {
      descricaoTipo: record.descricaoTipo?.trim() || null,
      externalCodTipo: toInteger(record.codTipo),
    });

    const bucketYear = Number(dataApresentacao.slice(0, 4));
    const dia = dataApresentacao.slice(0, 10);
    const porDeputado =
      input.buckets.get(bucketYear) ?? new Map<string, DeputadoAcumulador>();
    input.buckets.set(bucketYear, porDeputado);

    for (const [deputadoId, primeiro] of assinantes) {
      const acumulador = porDeputado.get(deputadoId) ?? {
        dias: new Map<string, ContadorAssinaturas>(),
        tipos: new Map<string, ContadorAssinaturas>(),
      };
      porDeputado.set(deputadoId, acumulador);

      incrementaPar(acumulador.dias, dia, primeiro);
      incrementaPar(acumulador.tipos, siglaTipo, primeiro);
    }

    input.pendentes.delete(externalIdProposicao);
  }

  return { read, ignoredTipoExcluido, rejected };
}

export function toDeputadoProposicaoAssinadaRows(
  bucketYear: number,
  porDeputado: ReadonlyMap<string, DeputadoAcumulador>,
): readonly DeputadoProposicaoAssinadaRow[] {
  return [...porDeputado.entries()].map(([deputadoId, acumulador]) => ({
    deputadoId,
    year: bucketYear,
    assinaturasJson: Object.fromEntries(acumulador.dias),
    composicaoJson: Object.fromEntries(acumulador.tipos),
  }));
}

export function toProposicaoTipoRows(
  tipos: TipoRegistry,
): readonly ProposicaoTipoRow[] {
  return [...tipos.entries()].map(([siglaTipo, registro]) => ({
    siglaTipo,
    ...registro,
  }));
}

function incrementaPar(
  map: Map<string, ContadorAssinaturas>,
  key: string,
  primeiro: boolean,
): void {
  const [assinadas, primeiras] = map.get(key) ?? [0, 0];
  map.set(key, [assinadas + 1, primeiras + (primeiro ? 1 : 0)]);
}

function toInteger(value: string | undefined): number | null {
  return value !== undefined && /^-?\d+$/.test(value.trim())
    ? Number(value)
    : null;
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}/.test(value)) {
    return false;
  }
  const date = new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.valueOf()) &&
    date.toISOString().slice(0, 10) === value.slice(0, 10)
  );
}
