import type { EventoExercicio } from '../types/exercicio.types';

export type EfeitoExercicio = 'open' | 'close' | 'neutral';

const PRIMEIRA_POSSE_LEGADA = 'Primeira posse na legislatura (dados legados)';
const FIM_LEGISLATURA_LEGADO =
  'Situação e condição ao fim da legislatura (dados legados)';
const SITUACOES_FECHAM = ['Licença', 'Suplência', 'Fim de Mandato', 'Vacância'];

function abre(evento: EventoExercicio): boolean {
  return (
    evento.descricaoStatus.includes('Entrada -') ||
    evento.descricaoStatus === PRIMEIRA_POSSE_LEGADA
  );
}

function fecha(evento: EventoExercicio): boolean {
  return (
    evento.descricaoStatus.includes('Saída -') ||
    SITUACOES_FECHAM.includes(evento.situacao ?? '') ||
    evento.descricaoStatus === FIM_LEGISLATURA_LEGADO
  );
}

export function classifyEvento(evento: EventoExercicio): EfeitoExercicio {
  if (abre(evento)) {
    return 'open';
  }
  if (fecha(evento)) {
    return 'close';
  }
  return 'neutral';
}
