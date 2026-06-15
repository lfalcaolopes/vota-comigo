import Image from "next/image";

import { getInitials } from "../lib/matcher-presentation";

type DeputadoAvatarProps = {
  nome: string | null;
  urlFoto: string | null;
};

export function DeputadoAvatar({ nome, urlFoto }: DeputadoAvatarProps) {
  if (urlFoto) {
    return (
      <Image
        alt=""
        className="size-10 rounded-full border border-border object-cover"
        height={40}
        src={urlFoto}
        width={40}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-surface-muted text-sm font-[680] text-muted"
    >
      {getInitials(nome)}
    </span>
  );
}
