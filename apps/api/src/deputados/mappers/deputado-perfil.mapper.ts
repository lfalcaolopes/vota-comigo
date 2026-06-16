import type { DeputadoPerfil } from '@vota-comigo/shared-types';

import { isEmAtividade } from '@/exercicio/rules/intervalos-exercicio';
import type { EventoExercicio } from '@/exercicio/types/exercicio.types';

import { nomePublicoDeputado } from '../rules/nome-publico';
import { parseRedesSociais } from '../rules/redes-sociais';
import { deriveSnapshotPublico } from '../rules/snapshot-publico';
import type { DeputadoPerfilSource } from '../types/deputados.types';
import { fonteOficialDeputado } from './camara-portal-url';

export function toDeputadoPerfil(source: DeputadoPerfilSource): DeputadoPerfil {
  const snapshot = deriveSnapshotPublico(source.eventos);

  const nomePublico = nomePublicoDeputado({
    nomeEleitoral: snapshot?.nomeEleitoral ?? null,
    nome: source.nome,
    nomeCivil: source.nomeCivil,
  });

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
    nomePublico,
    nomeCivil: source.nomeCivil,
    fonteOficial: fonteOficialDeputado(source.externalIdDeputado),
    historicoParlamentarDisponivel: source.eventos.length > 0,
    snapshotPublicoDisponivel: snapshot !== null,
    snapshotPublico: snapshot,
    emAtividade: isEmAtividade(eventosExercicio),
    redesSociais: parseRedesSociais(source.urlRedeSocial),
    dataNascimento: source.dataNascimento,
    municipioNascimento: source.municipioNascimento,
    ufNascimento: source.ufNascimento,
    externalIdLegislaturaInicial: source.externalIdLegislaturaInicial,
    externalIdLegislaturaFinal: source.externalIdLegislaturaFinal,
  };
}
