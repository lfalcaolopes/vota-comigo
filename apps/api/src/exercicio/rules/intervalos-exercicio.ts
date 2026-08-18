import type {
  EventoExercicio,
  IntervaloExercicio,
  VotacaoRef,
} from '../types/exercicio.types';
import { classifyEvento } from './evento-exercicio';
import { toEpochMillis } from './instante';

type EventoOrdenado = {
  evento: EventoExercicio;
  epoch: number;
};

function ordenarPorInstante(
  eventos: readonly EventoExercicio[],
): readonly EventoOrdenado[] {
  return eventos
    .flatMap((evento) => {
      const epoch = toEpochMillis(evento.dataHora);
      return epoch === null ? [] : [{ evento, epoch }];
    })
    .sort((a, b) => a.epoch - b.epoch);
}

export function resolveVotacaoTimestamp(votacao: VotacaoRef): number | null {
  const bruto = votacao.dataHoraRegistro ?? votacao.data ?? null;
  return bruto === null ? null : toEpochMillis(bruto);
}

export function deriveIntervalosExercicio(
  eventos: readonly EventoExercicio[],
): readonly IntervaloExercicio[] {
  const intervalos: IntervaloExercicio[] = [];
  let openedAt: string | null = null;

  for (const { evento } of ordenarPorInstante(eventos)) {
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

export function isEmExercicioFromIntervalos(
  intervalos: readonly IntervaloExercicio[],
  instante: number,
): boolean {
  return intervalos.some((intervalo) => {
    const abertura = toEpochMillis(intervalo.openedAt);
    if (abertura === null || abertura > instante) {
      return false;
    }
    // um limite ilegível não vira intervalo em aberto: sem instante confiável,
    // o intervalo simplesmente não casa
    const fechamento =
      intervalo.closedAt === null
        ? Number.POSITIVE_INFINITY
        : toEpochMillis(intervalo.closedAt);
    return fechamento !== null && instante < fechamento;
  });
}

export function isEmAtividadeFromIntervalos(
  intervalos: readonly IntervaloExercicio[],
): boolean {
  return intervalos.some((intervalo) => intervalo.closedAt === null);
}

export function isEmExercicio(
  eventos: readonly EventoExercicio[],
  instante: string,
): boolean {
  const epoch = toEpochMillis(instante);
  return (
    epoch !== null &&
    isEmExercicioFromIntervalos(deriveIntervalosExercicio(eventos), epoch)
  );
}

export function isEmAtividade(eventos: readonly EventoExercicio[]): boolean {
  return isEmAtividadeFromIntervalos(deriveIntervalosExercicio(eventos));
}

export function getPartidoVigente(
  eventos: readonly EventoExercicio[],
  instante: string,
): string | null {
  const limite = toEpochMillis(instante);
  if (limite === null) {
    return null;
  }

  const comPartido = ordenarPorInstante(eventos).filter(
    (item) => item.epoch <= limite && item.evento.partido !== null,
  );
  return comPartido.at(-1)?.evento.partido ?? null;
}
