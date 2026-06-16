import type { DeputadoPerfil } from '@vota-comigo/shared-types';

import { nomePublicoDeputado } from '../rules/nome-publico';
import type { DeputadoPerfilSource } from '../types/deputados.types';
import { fonteOficialDeputado } from './camara-portal-url';

export function toDeputadoPerfil(source: DeputadoPerfilSource): DeputadoPerfil {
  return {
    externalIdDeputado: source.externalIdDeputado,
    nomePublico: nomePublicoDeputado({
      nome: source.nome,
      nomeCivil: source.nomeCivil,
    }),
    nomeCivil: source.nomeCivil,
    fonteOficial: fonteOficialDeputado(source.externalIdDeputado),
    historicoParlamentarDisponivel: source.temHistoricoParlamentar,
  };
}
