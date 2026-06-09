import { POSICOES_COMPUTAVEIS } from '@vota-comigo/shared-types';
import type {
  AlertaMatcher,
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

// linha do prefiltro DISTINCT ON: estado mais recente conhecido por deputado
export type DeputadoEstadoRow = {
  deputadoId: string;
  siglaUf: string | null;
  urlFoto: string | null;
  partido: string | null;
};

export type VotacaoReferenciaVotos = {
  externalIdProposicao: number;
  votacaoReferencia: VotacaoRef;
  votosByDeputado: ReadonlyMap<string, VotoCategoria>;
};
