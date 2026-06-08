const CAMARA_HOST = 'https://www.camara.leg.br';

export function fonteOficialProposicao(externalIdProposicao: number): string {
  return `${CAMARA_HOST}/proposicoesWeb/fichadetramitacao?idProposicao=${externalIdProposicao}`;
}

export function fonteOficialVotacao(externalIdVotacao: string): string {
  return `${CAMARA_HOST}/votacoes/${externalIdVotacao}`;
}
