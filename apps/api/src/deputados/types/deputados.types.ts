export type DeputadoHistoricoEventoSource = {
  dataHora: string;
  situacao: string | null;
  descricaoStatus: string;
  nomeEleitoral: string | null;
  siglaPartido: string | null;
  siglaUf: string | null;
  urlFoto: string | null;
};

export type DeputadoPerfilSource = {
  externalIdDeputado: number;
  nome: string | null;
  nomeCivil: string | null;
  dataNascimento: string | null;
  municipioNascimento: string | null;
  ufNascimento: string | null;
  urlRedeSocial: string | null;
  externalIdLegislaturaInicial: number | null;
  externalIdLegislaturaFinal: number | null;
  eventos: readonly DeputadoHistoricoEventoSource[];
};
