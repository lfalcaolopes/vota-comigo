import { ButtonLink } from "@/shared/ui";

export function DeputadoPerfilLink({
  externalIdDeputado,
}: {
  externalIdDeputado: number;
}) {
  return (
    <ButtonLink
      aria-label="Ver perfil do deputado em uma nova aba"
      href={`/deputados/${externalIdDeputado}`}
      rel="noopener noreferrer"
      target="_blank"
    >
      Ver perfil do deputado
    </ButtonLink>
  );
}
