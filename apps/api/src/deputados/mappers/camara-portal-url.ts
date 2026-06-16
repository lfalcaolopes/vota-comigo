const CAMARA_HOST = 'https://www.camara.leg.br';

export function fonteOficialDeputado(externalIdDeputado: number): string {
  return `${CAMARA_HOST}/deputados/${externalIdDeputado}`;
}
