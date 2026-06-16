import type { DeputadoSnapshotPublico } from '@vota-comigo/shared-types';

import type { DeputadoHistoricoEventoSource } from '../types/deputados.types';

export function deriveSnapshotPublico(
  eventos: readonly DeputadoHistoricoEventoSource[],
): DeputadoSnapshotPublico | null {
  if (eventos.length === 0) return null;

  const maisRecente = eventos.reduce((best, current) =>
    current.dataHora >= best.dataHora ? current : best,
  );

  return {
    nomeEleitoral: maisRecente.nomeEleitoral,
    siglaPartido: maisRecente.siglaPartido,
    siglaUf: maisRecente.siglaUf,
    urlFoto: maisRecente.urlFoto,
  };
}
