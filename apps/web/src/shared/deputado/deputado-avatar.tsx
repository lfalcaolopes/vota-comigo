import Image from "next/image";

import { CARGO_DEPUTADO, getInitials } from "./presentation";

type DeputadoAvatarSize = "sm" | "lg" | "xl";

type DeputadoAvatarProps = {
  nome: string | null;
  urlFoto: string | null;
  size?: DeputadoAvatarSize;
};

const SIZE_CONFIG = {
  sm: { px: 40, className: "size-10" },
  lg: { px: 64, className: "size-14 md:size-16" },
  xl: { px: 96, className: "size-20 md:size-24" },
} as const satisfies Record<
  DeputadoAvatarSize,
  { px: number; className: string }
>;

export function DeputadoAvatar({
  nome,
  urlFoto,
  size = "sm",
}: DeputadoAvatarProps) {
  const { px, className } = SIZE_CONFIG[size];
  const identidade = nome ?? CARGO_DEPUTADO;

  if (urlFoto) {
    return (
      <Image
        alt={nome ? `Foto de ${nome}` : "Foto do deputado"}
        className={`${className} rounded-full border border-border object-cover`}
        height={px}
        src={urlFoto}
        width={px}
      />
    );
  }

  return (
    <span
      aria-label={identidade}
      role="img"
      className={`inline-flex ${className} shrink-0 items-center justify-center rounded-full border border-border bg-surface-muted text-sm font-[680] text-muted`}
    >
      {getInitials(nome)}
    </span>
  );
}
