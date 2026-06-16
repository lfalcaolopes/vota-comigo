import type {
  DeputadoPeriodoPartidario,
  DeputadoSnapshotPublico,
} from '@vota-comigo/shared-types';

import type { DeputadoHistoricoEventoSource } from '../types/deputados.types';

export type DeriveHistoricoPartidarioInput = {
  eventos: readonly DeputadoHistoricoEventoSource[];
  snapshot: DeputadoSnapshotPublico | null;
};

export type HistoricoPartidarioResult = {
  historicoPartidarioDisponivel: boolean;
  historicoPartidario: DeputadoPeriodoPartidario[];
};

type Grupo = {
  siglaPartido: string;
  dataInicio: string;
};

export function deriveHistoricoPartidario(
  input: DeriveHistoricoPartidarioInput,
): HistoricoPartidarioResult {
  const comPartido = input.eventos.filter(
    (e): e is DeputadoHistoricoEventoSource & { siglaPartido: string } =>
      e.siglaPartido !== null,
  );

  if (comPartido.length === 0) {
    return { historicoPartidarioDisponivel: false, historicoPartidario: [] };
  }

  const ordenados = [...comPartido].sort((a, b) =>
    a.dataHora < b.dataHora ? -1 : a.dataHora > b.dataHora ? 1 : 0,
  );

  const grupos = ordenados.reduce<Grupo[]>((acc, e) => {
    const ultimo = acc[acc.length - 1];
    if (ultimo && ultimo.siglaPartido === e.siglaPartido) {
      return acc;
    }
    return [
      ...acc,
      { siglaPartido: e.siglaPartido, dataInicio: e.dataHora.slice(0, 10) },
    ];
  }, []);

  const cronologico = grupos.map((grupo, index) => ({
    siglaPartido: grupo.siglaPartido,
    dataInicio: grupo.dataInicio,
    dataFim: grupos[index + 1]?.dataInicio ?? null,
    atual: false,
  }));

  const recenteAoAntigo = [...cronologico].reverse();

  const maisRecente = recenteAoAntigo[0];
  const atualNoMaisRecente =
    input.snapshot?.siglaPartido != null &&
    input.snapshot.siglaPartido === maisRecente.siglaPartido;

  const historicoPartidario = recenteAoAntigo.map((periodo, index) => ({
    ...periodo,
    atual: index === 0 && atualNoMaisRecente,
  }));

  return { historicoPartidarioDisponivel: true, historicoPartidario };
}
