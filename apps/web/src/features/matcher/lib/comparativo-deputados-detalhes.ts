import type {
  DeputadoPerfil,
  MatcherDeputadoDetalhe,
  MatcherExecucaoRequest,
} from "@vota-comigo/shared-types";

type GetDeputadoDetalhe = (
  externalIdDeputado: number,
  request: MatcherExecucaoRequest,
) => Promise<MatcherDeputadoDetalhe>;

type GetDeputadoPerfil = (
  externalIdDeputado: number,
) => Promise<DeputadoPerfil>;

type LoadComparativoDeputadosDataInput = {
  externalIdsDeputado: number[];
  request: MatcherExecucaoRequest;
  getDeputadoDetalhe: GetDeputadoDetalhe;
  getDeputadoPerfil: GetDeputadoPerfil;
};

export type ComparativoDeputadosData = {
  detalhes: MatcherDeputadoDetalhe[];
  perfis: DeputadoPerfil[];
};

export async function loadComparativoDeputadosData({
  externalIdsDeputado,
  request,
  getDeputadoDetalhe,
  getDeputadoPerfil,
}: LoadComparativoDeputadosDataInput): Promise<ComparativoDeputadosData> {
  const items = await Promise.all(
    externalIdsDeputado.map(async (externalIdDeputado) => {
      const [detalhe, perfil] = await Promise.all([
        getDeputadoDetalhe(externalIdDeputado, request),
        getDeputadoPerfil(externalIdDeputado),
      ]);

      return { detalhe, perfil };
    }),
  );

  return {
    detalhes: items.map((item) => item.detalhe),
    perfis: items.map((item) => item.perfil),
  };
}
