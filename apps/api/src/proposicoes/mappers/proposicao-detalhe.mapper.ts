import type {
  PlacarVotacao,
  ProposicaoDetalhe,
  VotacaoNominal,
} from '@vota-comigo/shared-types';

import { interpretResultado } from '@/matcher/rules/votacao-referencia';

import type {
  ProposicaoDetalheResult,
  VotacaoDetalheRow,
} from '../proposicoes.repository';
import { fonteOficialProposicao } from './camara-portal-url';

function toPlacar(row: VotacaoDetalheRow): PlacarVotacao {
  if (row.votacaoVotosExternalId !== null) {
    return {
      placarCompleto: true,
      votosSim: row.votacaoVotosSim ?? 0,
      votosNao: row.votacaoVotosNao ?? 0,
      votosAbstencao: row.votosAbstencao ?? 0,
      votosObstrucao: row.votosObstrucao ?? 0,
      votosArtigo17: row.votosArtigo17 ?? 0,
      votosNaoInformado: row.votosNaoInformado ?? 0,
    };
  }

  return {
    placarCompleto: false,
    votosSim: row.votosSim ?? 0,
    votosNao: row.votosNao ?? 0,
    votosOutros: row.votosOutros ?? 0,
  };
}

function toVotacaoNominal(row: VotacaoDetalheRow): VotacaoNominal {
  return {
    externalIdVotacao: row.externalIdVotacao,
    data: row.data,
    descricao: row.descricao,
    placar: toPlacar(row),
    resultado: interpretResultado(row.aprovacao),
    isReferenciaMatcher: row.isReferenciaMatcher,
  };
}

export function toProposicaoDetalhe(
  result: ProposicaoDetalheResult,
): ProposicaoDetalhe {
  const { proposicao } = result;
  return {
    externalIdProposicao: proposicao.externalIdProposicao,
    siglaTipo: proposicao.siglaTipo,
    numero: proposicao.numero,
    ano: proposicao.ano,
    ementa: proposicao.ementa,
    dataApresentacao: proposicao.dataApresentacao,
    ementaDetalhada: proposicao.ementaDetalhada,
    urlInteiroTeor: proposicao.urlInteiroTeor,
    status: {
      siglaOrgao: proposicao.ultimoStatusSiglaOrgao,
      situacao: proposicao.ultimoStatusDescricaoSituacao,
      regime: proposicao.ultimoStatusRegime,
      dataHora: proposicao.ultimoStatusDataHora,
    },
    fonteOficial: fonteOficialProposicao(proposicao.externalIdProposicao),
    temas: result.temas.map((tema) => ({
      externalCodTema: tema.externalCodTema,
      tema: tema.tema,
    })),
    votacoes: result.votacoes.map(toVotacaoNominal),
  };
}
