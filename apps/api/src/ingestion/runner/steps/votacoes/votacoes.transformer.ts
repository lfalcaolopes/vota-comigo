import type { CsvRecord } from '../../csv-reader';
import type { EscopoVotacao, VotacaoRow } from './votacoes.repository.types';

const PLENARY_ORGAOS = new Set(['PLEN', 'CN']);

export function deriveEscopoVotacao(siglaOrgao: string | null): EscopoVotacao {
  if (siglaOrgao !== null && PLENARY_ORGAOS.has(siglaOrgao)) {
    return 'plenario';
  }

  return 'comissao';
}

export function toVotacaoRow(record: CsvRecord): VotacaoRow {
  const siglaOrgao = emptyToNull(record.siglaOrgao);

  return {
    externalIdVotacao: record.id,
    uri: emptyToNull(record.uri),
    data: emptyToNull(record.data),
    dataHoraRegistro: emptyToNull(record.dataHoraRegistro),
    externalIdOrgao: parseInteger(record.idOrgao),
    siglaOrgao,
    escopoVotacao: deriveEscopoVotacao(siglaOrgao),
    externalIdEvento: parseInteger(record.idEvento),
    aprovacao: parseInteger(record.aprovacao),
    votosSim: parseInteger(record.votosSim),
    votosNao: parseInteger(record.votosNao),
    votosOutros: parseInteger(record.votosOutros),
    descricao: emptyToNull(record.descricao),
    ultimaAberturaVotacaoDataHoraRegistro: emptyToNull(
      record.ultimaAberturaVotacao_dataHoraRegistro,
    ),
    ultimaAberturaVotacaoDescricao: emptyToNull(
      record.ultimaAberturaVotacao_descricao,
    ),
    ultimaApresentacaoProposicaoDataHoraRegistro: emptyToNull(
      record.ultimaApresentacaoProposicao_dataHoraRegistro,
    ),
    ultimaApresentacaoProposicaoDescricao: emptyToNull(
      record.ultimaApresentacaoProposicao_descricao,
    ),
    externalIdProposicaoUltimaApresentacao: parseInteger(
      record.ultimaApresentacaoProposicao_idProposicao,
    ),
    uriProposicaoUltimaApresentacao: emptyToNull(
      record.ultimaApresentacaoProposicao_uriProposicao,
    ),
  };
}

function parseInteger(value: string | undefined): number | null {
  if (value === undefined || !/^-?\d+$/.test(value.trim())) {
    return null;
  }

  return Number(value.trim());
}

function emptyToNull(value: string | undefined): string | null {
  if (value === undefined || value.trim() === '') {
    return null;
  }

  return value;
}
