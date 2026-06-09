export type EventoExercicio = {
  dataHora: string;
  situacao: string | null;
  descricaoStatus: string;
  partido: string | null;
};

export type VotacaoRef = {
  dataHoraRegistro: string | null;
  data: string | null;
};

export type IntervaloExercicio = {
  openedAt: string;
  closedAt: string | null;
};
