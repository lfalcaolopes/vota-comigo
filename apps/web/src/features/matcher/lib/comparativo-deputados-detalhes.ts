import type {
  DeputadoPerfil,
  MatcherDeputadoDetalhe,
  MatcherDeputadoResumo,
  MatcherExecucaoRequest,
} from "@vota-comigo/shared-types";

type GetDeputadoDetalhe = (
  externalIdDeputado: number,
  request: MatcherExecucaoRequest,
) => Promise<MatcherDeputadoDetalhe>;

type GetDeputadoPerfil = (externalIdDeputado: number) => Promise<DeputadoPerfil>;

type LoadComparativoDeputadosDetalhesInput = {
  selectedDeputados: MatcherDeputadoResumo[];
  request: MatcherExecucaoRequest;
  getDeputadoDetalhe: GetDeputadoDetalhe;
};

type LoadComparativoDeputadosDataInput = LoadComparativoDeputadosDetalhesInput & {
  getDeputadoPerfil: GetDeputadoPerfil;
};

export type ComparativoDeputadosData = {
  detalhes: MatcherDeputadoDetalhe[];
  perfis: DeputadoPerfil[];
};

export function loadComparativoDeputadosDetalhes({
  selectedDeputados,
  request,
  getDeputadoDetalhe,
}: LoadComparativoDeputadosDetalhesInput): Promise<MatcherDeputadoDetalhe[]> {
  return Promise.all(
    selectedDeputados.map((deputado) =>
      getDeputadoDetalhe(deputado.externalIdDeputado, request),
    ),
  );
}

export async function loadComparativoDeputadosData({
  selectedDeputados,
  request,
  getDeputadoDetalhe,
  getDeputadoPerfil,
}: LoadComparativoDeputadosDataInput): Promise<ComparativoDeputadosData> {
  const items = await Promise.all(
    selectedDeputados.map(async (deputado) => {
      const [detalhe, perfil] = await Promise.all([
        getDeputadoDetalhe(deputado.externalIdDeputado, request),
        getDeputadoPerfil(deputado.externalIdDeputado),
      ]);

      return { detalhe, perfil };
    }),
  );

  return {
    detalhes: items.map((item) => item.detalhe),
    perfis: items.map((item) => item.perfil),
  };
}
