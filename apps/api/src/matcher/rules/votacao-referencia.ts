import type {
  Resultado,
  VotacaoReferenciaPattern,
} from '@vota-comigo/shared-types';

export type VotacaoCandidate = {
  externalIdVotacao: string;
  data: string | null;
  dataHoraRegistro: string | null;
  descricao: string | null;
  ultimaAberturaVotacaoDescricao: string | null;
  ultimaApresentacaoProposicaoDescricao: string | null;
  votosSim: number | null;
  votosNao: number | null;
  votosOutros: number | null;
  aprovacao: number | null;
};

export type VotacaoClassification = {
  priority: number;
  pattern: VotacaoReferenciaPattern;
};

export type ClassifiedVotacao = VotacaoCandidate & {
  classification: VotacaoClassification;
  totalVotos: number;
};

function unaccent(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function normalizeDescricao(descricao: string | null): string {
  return unaccent((descricao ?? '').toLowerCase());
}

function trimToNull(value: string | null): string | null {
  const trimmed = (value ?? '').trim();
  return trimmed === '' ? null : trimmed;
}

function cascadeText(candidate: VotacaoCandidate): string {
  return (
    trimToNull(candidate.ultimaAberturaVotacaoDescricao) ??
    trimToNull(candidate.ultimaApresentacaoProposicaoDescricao) ??
    trimToNull(candidate.descricao) ??
    ''
  );
}

const SEGUNDO_TURNO = /(segundo turno|2[º°]? turno)/i;
const PRIMEIRO_TURNO = /(primeiro turno|1[º°]? turno|turno 1)/i;
const TURNO_UNICO = /(turno único|turno unico)/i;
const PEC = /proposta de emenda a constituicao/;
const CASCADE_DISCARD =
  /(vota[cç][ãa]o do dtq|(^|[^\p{L}\p{N}_])dtq([^\p{L}\p{N}_]|$)|destaque|requerimento|reda[cç][ãa]o final|redacao final|emenda aglutinativa)/iu;
const D_RECALL_EXCLUSION =
  /(destaque|dtq|mantido o texto|suprimido o texto|emenda de (plenario|comissao)|redacao final)/;
const REDACAO_FINAL = /redacao final/;

export function classifyVotacaoReferencia(
  candidate: VotacaoCandidate,
): VotacaoClassification | null {
  const d = normalizeDescricao(candidate.descricao);
  const cascade = cascadeText(candidate);

  if (/(requerimento|recurso|intersticio|dispensa|preferencia)/.test(d)) {
    return null;
  }
  if (PEC.test(d) && SEGUNDO_TURNO.test(cascade)) {
    return { priority: 6, pattern: 'pec_segundo_turno' };
  }
  if (/(aprovad.|rejeitad.) a medida provisoria/.test(d)) {
    return { priority: 5, pattern: 'medida_provisoria' };
  }
  if (/(aprovad.|rejeitad.) o projeto de lei/.test(d)) {
    return { priority: 5, pattern: 'projeto_de_lei' };
  }
  if (/(aprovad.|rejeitad.) o projeto de decreto legislativo/.test(d)) {
    return { priority: 5, pattern: 'projeto_decreto_legislativo' };
  }
  if (/(aprovad.|rejeitad.) o projeto de resolucao/.test(d)) {
    return { priority: 5, pattern: 'projeto_resolucao' };
  }
  if (
    /(aprovad.|rejeitad.) (o substitutivo|a subemenda substitutiva)/.test(d)
  ) {
    return { priority: 5, pattern: 'substitutivo_ou_subemenda_substitutiva' };
  }
  if (PEC.test(d)) {
    return { priority: 5, pattern: 'pec_generica' };
  }
  if (/emendas do senado federal/.test(d)) {
    return { priority: 4, pattern: 'emendas_senado_federal' };
  }
  if (PEC.test(d) && PRIMEIRO_TURNO.test(cascade)) {
    return { priority: 3, pattern: 'pec_primeiro_turno' };
  }
  if (
    !CASCADE_DISCARD.test(cascade) &&
    (SEGUNDO_TURNO.test(cascade) ||
      TURNO_UNICO.test(cascade) ||
      PRIMEIRO_TURNO.test(cascade)) &&
    !D_RECALL_EXCLUSION.test(d)
  ) {
    return { priority: 2, pattern: 'recall_turno_cascata' };
  }
  if (REDACAO_FINAL.test(d)) {
    return { priority: 1, pattern: 'redacao_final' };
  }

  return null;
}

function totalVotos(candidate: VotacaoCandidate): number {
  return (
    (candidate.votosSim ?? 0) +
    (candidate.votosNao ?? 0) +
    (candidate.votosOutros ?? 0)
  );
}

function compareReferencia(a: ClassifiedVotacao, b: ClassifiedVotacao): number {
  if (a.classification.priority !== b.classification.priority) {
    return b.classification.priority - a.classification.priority;
  }
  if (a.dataHoraRegistro !== b.dataHoraRegistro) {
    if (a.dataHoraRegistro === null) return 1;
    if (b.dataHoraRegistro === null) return -1;
    return a.dataHoraRegistro < b.dataHoraRegistro ? 1 : -1;
  }
  if (a.totalVotos !== b.totalVotos) {
    return b.totalVotos - a.totalVotos;
  }
  if (a.externalIdVotacao !== b.externalIdVotacao) {
    return a.externalIdVotacao < b.externalIdVotacao ? 1 : -1;
  }
  return 0;
}

export function selectVotacaoReferencia(
  candidates: readonly VotacaoCandidate[],
): ClassifiedVotacao | null {
  const classified = candidates.flatMap((candidate) => {
    const classification = classifyVotacaoReferencia(candidate);
    if (classification === null) {
      return [];
    }
    return [
      { ...candidate, classification, totalVotos: totalVotos(candidate) },
    ];
  });

  if (classified.length === 0) {
    return null;
  }

  return [...classified].sort(compareReferencia)[0];
}

export function interpretResultado(aprovacao: number | null): Resultado {
  if (aprovacao === 1) return 'aprovada';
  if (aprovacao === 0) return 'rejeitada';
  return 'indisponivel';
}
