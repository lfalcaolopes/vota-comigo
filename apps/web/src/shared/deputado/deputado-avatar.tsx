import Image from "next/image";

import { getInitials } from "./presentation";

type DeputadoAvatarSize = "sm" | "lg";

type DeputadoAvatarProps = {
  nome: string | null;
  urlFoto: string | null;
  size?: DeputadoAvatarSize;
};

const SIZE_CONFIG = {
  sm: { px: 40, className: "size-10" },
  lg: { px: 64, className: "size-16" },
} as const satisfies Record<DeputadoAvatarSize, { px: number; className: string }>;

export function DeputadoAvatar({
  nome,
  urlFoto,
  size = "sm",
}: DeputadoAvatarProps) {
  const { px, className } = SIZE_CONFIG[size];

  if (urlFoto) {
    return (
      <Image
        alt=""
        className={`${className} rounded-full border border-border object-cover`}
        height={px}
        src={urlFoto}
        width={px}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`inline-flex ${className} shrink-0 items-center justify-center rounded-full border border-border bg-surface-muted text-sm font-[680] text-muted`}
    >
      {getInitials(nome)}
    </span>
  );
}
