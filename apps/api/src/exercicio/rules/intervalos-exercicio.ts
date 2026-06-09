import type {
  EventoExercicio,
  IntervaloExercicio,
  VotacaoRef,
} from '../types/exercicio.types';
import { classifyEvento } from './evento-exercicio';

export function resolveVotacaoTimestamp(votacao: VotacaoRef): string | null {
  return votacao.dataHoraRegistro ?? votacao.data ?? null;
}

export function deriveIntervalosExercicio(
  eventos: readonly EventoExercicio[],
): readonly IntervaloExercicio[] {
  const ordenados = [...eventos].sort((a, b) =>
    a.dataHora < b.dataHora ? -1 : a.dataHora > b.dataHora ? 1 : 0,
  );

  const intervalos: IntervaloExercicio[] = [];
  let openedAt: string | null = null;

  for (const evento of ordenados) {
    const efeito = classifyEvento(evento);
    if (efeito === 'open' && openedAt === null) {
      openedAt = evento.dataHora;
    } else if (efeito === 'close' && openedAt !== null) {
      intervalos.push({ openedAt, closedAt: evento.dataHora });
      openedAt = null;
    }
  }

  if (openedAt !== null) {
    intervalos.push({ openedAt, closedAt: null });
  }

  return intervalos;
}

export function isEmExercicio(
  eventos: readonly EventoExercicio[],
  instante: string,
): boolean {
  return deriveIntervalosExercicio(eventos).some(
    (intervalo) =>
      intervalo.openedAt <= instante &&
      (intervalo.closedAt === null || instante < intervalo.closedAt),
  );
}

export function getPartidoVigente(
  eventos: readonly EventoExercicio[],
  instante: string,
): string | null {
  const comPartido = eventos.filter(
    (evento) => evento.dataHora <= instante && evento.partido !== null,
  );
  return comPartido.at(-1)?.partido ?? null;
}
