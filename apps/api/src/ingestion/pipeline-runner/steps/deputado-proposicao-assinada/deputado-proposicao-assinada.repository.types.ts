// [assinadas, primeiras] — o contador de primeiro signatário nunca é um
// subconjunto exibido do total, apenas um segundo contador ao lado dele.
export type ContadorAssinaturas = readonly [
  assinadas: number,
  primeiras: number,
];

export type AssinaturasJson = Record<string, ContadorAssinaturas>;
export type ComposicaoJson = Record<string, ContadorAssinaturas>;

export type DeputadoProposicaoAssinadaRow = {
  deputadoId: string;
  year: number;
  assinaturasJson: AssinaturasJson;
  composicaoJson: ComposicaoJson;
};

export type ProposicaoTipoRow = {
  siglaTipo: string;
  descricaoTipo: string | null;
  externalCodTipo: number | null;
};

export type DeputadoProposicaoAssinadaRepository = {
  loadDeputadoIdByExternalId(): Promise<ReadonlyMap<number, string>>;
  upsertTipos(rows: readonly ProposicaoTipoRow[]): Promise<void>;
  replaceAno(
    year: number,
    rows: readonly DeputadoProposicaoAssinadaRow[],
  ): Promise<{ inserted: number }>;
};
