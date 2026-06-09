import { POSICOES_COMPUTAVEIS } from '@vota-comigo/shared-types';
import type {
  AlertaMatcher,
  DeputadoVotacaoClassification,
  MatcherEffect,
  ProposicaoCard,
  VotacaoReferenciaResumo,
  SiglaUf,
  VotoCategoria,
} from '@vota-comigo/shared-types';

import type {
  EventoExercicio,
  VotacaoRef,
} from '@/exercicio/types/exercicio.types';

export type PosicaoComputavelValue = (typeof POSICOES_COMPUTAVEIS)[number];

export type PosicaoComputavel = {
  externalIdProposicao: number;
  posicao: PosicaoComputavelValue;
  proposicao: ProposicaoCard;
  votacaoReferencia: VotacaoRef;
  votosByDeputado: ReadonlyMap<string, VotoCategoria>;
};

export type DeputadoCompatibilidadeInput = {
  deputadoId: string;
  externalIdDeputado: number;
  nome: string | null;
  partido: string | null;
  siglaUf: SiglaUf;
  urlFoto: string | null;
  eventos: readonly EventoExercicio[];
};

export type DeputadoResumoComputado = {
  externalIdDeputado: number;
  nome: string | null;
  partido: string | null;
  siglaUf: SiglaUf;
  urlFoto: string | null;
  compatibilidadeBruta: number;
  amostraComparavel: number;
  scoreOrdenacaoPercentual: number;
  alertas: readonly AlertaMatcher[];
  emAtividade: boolean;
  coberturaExercicio: number;
};

export type CompatibilidadeResumidaResult = {
  deputados: readonly DeputadoResumoComputado[];
  totalDeputadosAvaliados: number;
  deputadosHistoricoIncompleto: number;
};

export type VotoDetalheComputado = {
  proposicao: ProposicaoCard;
  posicaoUsuario: PosicaoComputavelValue;
  votacaoReferencia: VotacaoReferenciaResumo;
  situacaoDeputadoVotacao: DeputadoVotacaoClassification;
  matcherEffect: MatcherEffect;
};

export type DeputadoDetalheComputado = {
  externalIdDeputado: number;
  nome: string | null;
  partido: string | null;
  siglaUf: SiglaUf;
  urlFoto: string | null;
  emAtividade: boolean;
  metrics: {
    totalConcordancias: number;
    totalDiscordancias: number;
    totalForaDoDenominador: number;
    amostraComparavel: number;
    coberturaExercicio: number;
    compatibilidadeBruta: number;
    scoreOrdenacaoPercentual: number;
    alertas: readonly AlertaMatcher[];
  };
  votos: readonly VotoDetalheComputado[];
};

// linha do prefiltro DISTINCT ON: estado mais recente conhecido por deputado
export type DeputadoEstadoRow = {
  deputadoId: string;
  siglaUf: string | null;
  urlFoto: string | null;
  partido: string | null;
};

export type VotacaoReferenciaVotos = {
  externalIdProposicao: number;
  proposicao: ProposicaoCard;
  votacaoReferencia: VotacaoRef;
  votosByDeputado: ReadonlyMap<string, VotoCategoria>;
};
