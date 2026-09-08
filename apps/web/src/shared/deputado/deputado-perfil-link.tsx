import { ButtonLink } from "@/shared/ui";
import { buildDeputadoHref } from "./deputado-url";

export function DeputadoPerfilLink({
  externalIdDeputado,
  nomePublico,
}: {
  externalIdDeputado: number;
  nomePublico: string | null;
}) {
  return (
    <ButtonLink
      aria-label="Ver perfil do deputado em uma nova aba"
      href={buildDeputadoHref(externalIdDeputado, nomePublico)}
      rel="noopener noreferrer"
      target="_blank"
    >
      Ver perfil do deputado
    </ButtonLink>
  );
}
