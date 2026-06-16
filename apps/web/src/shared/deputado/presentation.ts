import type { DeputadoPerfil } from "@vota-comigo/shared-types";

export const CARGO_DEPUTADO = "Deputado federal";

export function nomePublicoLabel(perfil: DeputadoPerfil): string {
  return perfil.nomePublico ?? CARGO_DEPUTADO;
}
