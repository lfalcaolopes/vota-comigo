import type {
  MatcherDeputadoDetalhe,
  MatcherDeputadoResumo,
  MatcherExecucaoRequest,
} from "@vota-comigo/shared-types";

type GetDeputadoDetalhe = (
  externalIdDeputado: number,
  request: MatcherExecucaoRequest,
) => Promise<MatcherDeputadoDetalhe>;

type LoadComparativoDeputadosDetalhesInput = {
  selectedDeputados: MatcherDeputadoResumo[];
  request: MatcherExecucaoRequest;
  getDeputadoDetalhe: GetDeputadoDetalhe;
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
