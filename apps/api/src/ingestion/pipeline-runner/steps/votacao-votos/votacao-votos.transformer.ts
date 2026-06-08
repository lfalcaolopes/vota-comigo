import type { Rejection } from '../../types/ingestion-pipeline-runner.types';
import {
  normalizeVotoCategoria,
  type NormalizedVotacaoVoto,
  type VotoCategoria,
} from '../../shared/votacoes-votos.normalizer';
import type {
  VotacaoVotosRow,
  VotosJson,
} from './votacao-votos.repository.types';

type VotacaoVotoLine = {
  lineNumber: number;
  voto: NormalizedVotacaoVoto;
};

export type TransformVotacaoVotosInput = {
  rows: AsyncIterable<VotacaoVotoLine> | Iterable<VotacaoVotoLine>;
  sourceFile: string;
  votacaoIds: ReadonlyMap<string, string>;
  deputadoIds: ReadonlyMap<number, string>;
};

export type TransformVotacaoVotosResult = {
  rows: VotacaoVotosRow[];
  ignored: number;
  rejected: Rejection[];
};

export async function transformVotacaoVotos(
  input: TransformVotacaoVotosInput,
): Promise<TransformVotacaoVotosResult> {
  const grouped = new Map<string, VotacaoVotosRow>();
  const rejected: Rejection[] = [];
  let ignored = 0;

  for await (const item of input.rows) {
    const externalIdVotacao = item.voto.idVotacao;

    if (externalIdVotacao === null) {
      ignored += 1;
      continue;
    }

    const votacaoId = input.votacaoIds.get(externalIdVotacao);

    if (votacaoId === undefined) {
      ignored += 1;
      continue;
    }

    const externalIdDeputado = item.voto.deputado.externalId;

    if (externalIdDeputado === null) {
      ignored += 1;
      continue;
    }

    const deputadoId = input.deputadoIds.get(externalIdDeputado);

    if (deputadoId === undefined) {
      rejected.push({
        file: input.sourceFile,
        line: item.lineNumber,
        type: 'deputado_externo_desconhecido',
        fields: {
          idVotacao: externalIdVotacao,
          idDeputado: String(externalIdDeputado),
          deputado_uri: item.voto.deputado.uri ?? '',
        },
        message:
          `Deputado externo ${externalIdDeputado} não encontrado para ` +
          `votação ${externalIdVotacao}.`,
      });
      continue;
    }

    const row =
      grouped.get(externalIdVotacao) ??
      createVotacaoVotosRow(externalIdVotacao, votacaoId);
    const categoria = normalizeVotoCategoria(item.voto.voto);
    row.votosJson[categoria].push(deputadoId);
    incrementCount(row, categoria);
    grouped.set(externalIdVotacao, row);
  }

  return { rows: [...grouped.values()], ignored, rejected };
}

function createVotacaoVotosRow(
  externalIdVotacao: string,
  votacaoId: string,
): VotacaoVotosRow {
  return {
    externalIdVotacao,
    votacaoId,
    votosJson: createEmptyVotosJson(),
    votosSim: 0,
    votosNao: 0,
    votosAbstencao: 0,
    votosObstrucao: 0,
    votosArtigo17: 0,
    votosNaoInformado: 0,
  };
}

function createEmptyVotosJson(): VotosJson {
  return {
    sim: [],
    nao: [],
    abstencao: [],
    obstrucao: [],
    artigo_17: [],
    nao_informado: [],
  };
}

function incrementCount(row: VotacaoVotosRow, categoria: VotoCategoria): void {
  switch (categoria) {
    case 'sim':
      row.votosSim += 1;
      break;
    case 'nao':
      row.votosNao += 1;
      break;
    case 'abstencao':
      row.votosAbstencao += 1;
      break;
    case 'obstrucao':
      row.votosObstrucao += 1;
      break;
    case 'artigo_17':
      row.votosArtigo17 += 1;
      break;
    case 'nao_informado':
      row.votosNaoInformado += 1;
      break;
  }
}
