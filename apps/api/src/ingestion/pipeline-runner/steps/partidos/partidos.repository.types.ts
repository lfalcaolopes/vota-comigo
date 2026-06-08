export type PartidoRow = {
  externalIdPartido: number;
  sigla: string | null;
  uri: string | null;
};

export type PartidoUpsertResult = {
  inserted: number;
  updated: number;
};

export type PartidoRepository = {
  upsert(rows: readonly PartidoRow[]): Promise<PartidoUpsertResult>;
};
