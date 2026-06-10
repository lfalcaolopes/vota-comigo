import { getInitials } from "../lib/matcher-presentation";

type DeputadoAvatarProps = {
  nome: string | null;
  urlFoto: string | null;
};

export function DeputadoAvatar({ nome, urlFoto }: DeputadoAvatarProps) {
  const displayName = nome ?? "Deputado";

  if (urlFoto) {
    return (
      <img
        alt={displayName}
        className="size-10 rounded-full border border-border object-cover"
        src={urlFoto}
      />
    );
  }

  return (
    <span
      aria-label={displayName}
      className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-surface-muted text-sm font-[680] text-muted"
    >
      <span aria-hidden="true">{getInitials(nome)}</span>
    </span>
  );
}
