import type { DeputadoCard } from '@vota-comigo/shared-types';

import { isEmAtividade } from '@/exercicio/rules/intervalos-exercicio';
import type { EventoExercicio } from '@/exercicio/types/exercicio.types';
import { nomePublicoDeputado } from '@/shared/deputado/nome-publico';

import { deriveSnapshotPublico } from '../rules/snapshot-publico';
import type { DeputadoPerfilSource } from '../types/deputados.types';

export function toDeputadoCard(source: DeputadoPerfilSource): DeputadoCard {
  const snapshot = deriveSnapshotPublico(source.eventos);
  const eventosExercicio: readonly EventoExercicio[] = source.eventos.map(
    (e) => ({
      dataHora: e.dataHora,
      situacao: e.situacao,
      descricaoStatus: e.descricaoStatus,
      partido: e.siglaPartido,
    }),
  );

  return {
    externalIdDeputado: source.externalIdDeputado,
    nomePublico: nomePublicoDeputado({
      nomeEleitoral: snapshot?.nomeEleitoral ?? null,
      nome: source.nome,
      nomeCivil: source.nomeCivil,
    }),
    nomeCivil: source.nomeCivil,
    siglaPartido: snapshot?.siglaPartido ?? null,
    siglaUf: snapshot?.siglaUf ?? null,
    urlFoto: snapshot?.urlFoto ?? null,
    emAtividade: isEmAtividade(eventosExercicio),
  };
}
