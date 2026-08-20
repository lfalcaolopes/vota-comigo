export {
  ceap,
  comparativoDeputados,
  discursos,
  feed,
  orgaos,
  partidosDisponiveis,
  perfil,
  ufsDisponiveis,
} from "./queries";
export {
  buildDeputadosFeedHref,
  buildDeputadosFeedSearchParams,
  parseDeputadosFeedUrlState,
  type DeputadosFeedSearchParams,
  type DeputadosFeedUrlState,
} from "./feed-url";
export {
  contarFiltrosAtivos,
  descreverFiltrosAtivos,
  removerFiltro,
  saoFiltrosIguais,
  FILTROS_PADRAO,
  type DeputadoFeedFiltros,
  type DeputadoFiltroAtivo,
  type DeputadoFiltroId,
} from "./feed-filtros";
export {
  deputadoFeedDisplay,
  deputadoFeedReducer,
  deputadoHasMore,
  deputadoNextOffset,
  initDeputadoFeedState,
  type DeputadoFeedDisplay,
  type DeputadoFeedState,
  type DeputadoFeedStatus,
} from "./feed-state";
export {
  useDeputadoFeedState,
  type UseDeputadoFeedState,
} from "./use-deputado-feed-state";
export {
  buildComparativoDeputadosHref,
  canOpenComparativo,
  hasComparativoDeputadoLimit,
  parseComparativoDeputadosIds,
  toComparativoDeputadosSegment,
  toggleComparativoDeputado,
  MAX_COMPARATIVO_DEPUTADOS,
  MIN_COMPARATIVO_DEPUTADOS,
  type ComparativoDeputadosHref,
} from "./comparativo-selecao";
export { ComparativoDeputados } from "./comparativo-deputados";
export { CopyDeputadosButton } from "./copy-deputados-button";
export {
  buildDeputadosText,
  type BuildDeputadosTextInput,
  type DeputadoTextItem,
} from "./deputados-text";
export { ComparativoDeputadosView } from "./comparativo-deputados-view";
export {
  buildComparativoDeputadosGrid,
  type ComparativoDeputadosGrid,
} from "./comparativo-deputados-grid";
export {
  useComparativoDeputados,
  type ComparativoDeputadosState,
} from "./use-comparativo-deputados";
export { usePartidosDisponiveis } from "./use-partidos-disponiveis";
export { DeputadoPerfil } from "./deputado-perfil";
export { parseDeputadoPerfilYear } from "./deputado-perfil-year-url";
export { DeputadoPerfilSkeleton } from "./deputado-perfil-skeleton";
export { DeputadoBreadcrumb } from "./deputado-breadcrumb";
export { DeputadoAvatar } from "./deputado-avatar";
export { AtividadeStatus } from "./atividade-status";
export { DeputadoPerfilLink } from "./deputado-perfil-link";
export { DeputadoRow } from "./deputado-row";
export { DeputadoPartidoControl } from "./deputado-partido-control";
export { DeputadoUfControl } from "./deputado-uf-control";
export { DeputadoSexoControl } from "./deputado-sexo-control";
export { DeputadoFaixaEtariaControl } from "./deputado-faixa-etaria-control";
export {
  CARGO_DEPUTADO,
  nomePublicoLabel,
  toAtividadeLabel,
  toAtividadeTone,
  toFaixaEtariaLabel,
  toDiasEmExercicioLabel,
  toSexoLabel,
  toUsoCotaPeriodoLabel,
  getInitials,
} from "./presentation";
