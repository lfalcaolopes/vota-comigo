const UF_NOMES: Record<string, string> = {
  ac: "Acre",
  al: "Alagoas",
  ap: "Amapá",
  am: "Amazonas",
  ba: "Bahia",
  ce: "Ceará",
  df: "Distrito Federal",
  es: "Espírito Santo",
  go: "Goiás",
  ma: "Maranhão",
  mt: "Mato Grosso",
  ms: "Mato Grosso do Sul",
  mg: "Minas Gerais",
  pa: "Pará",
  pb: "Paraíba",
  pr: "Paraná",
  pe: "Pernambuco",
  pi: "Piauí",
  rj: "Rio de Janeiro",
  rn: "Rio Grande do Norte",
  rs: "Rio Grande do Sul",
  ro: "Rondônia",
  rr: "Roraima",
  sc: "Santa Catarina",
  sp: "São Paulo",
  se: "Sergipe",
  to: "Tocantins",
  zz: "Exterior",
};

// A lead of this many points or more gets the full candidate color.
const FULL_COLOR_MARGIN = 0.3;
const MIN_MIX = 12;

export type MapaFill = {
  series: "a" | "b";
  mix: number;
  isDark: boolean;
};

export function toMapaFill(shareA: number): MapaFill {
  const margin = Math.abs(shareA - 0.5) * 2;
  const mix = Math.round(
    MIN_MIX + (100 - MIN_MIX) * Math.min(margin / FULL_COLOR_MARGIN, 1),
  );
  return { series: shareA >= 0.5 ? "a" : "b", mix, isDark: mix >= 62 };
}

export function toMapaFillColor(fill: MapaFill): string {
  return `color-mix(in oklch, var(--color-series-${fill.series}) ${fill.mix}%, var(--color-white))`;
}

export function formatUfLabel(siglaUf: string): string {
  return siglaUf === "zz" ? "Exterior" : siglaUf.toUpperCase();
}

export function formatUfNome(siglaUf: string): string {
  return UF_NOMES[siglaUf] ?? siglaUf.toUpperCase();
}

export function formatPercent(share: number, digits = 1): string {
  return `${(share * 100).toLocaleString("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}%`;
}

export function formatVotosCompact(votos: number): string {
  if (votos >= 1_000_000) {
    return `${(votos / 1_000_000).toLocaleString("pt-BR", {
      maximumFractionDigits: 1,
    })} mi`;
  }
  if (votos >= 1_000) {
    return `${Math.round(votos / 1_000).toLocaleString("pt-BR")} mil`;
  }
  return votos.toLocaleString("pt-BR");
}

export function formatPontos(pontos: number): string {
  const value = pontos.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  return `${value} ${Math.abs(Number(pontos.toFixed(1))) < 2 ? "ponto" : "pontos"}`;
}

export function formatUrnas(urnasApuradas: number): string {
  return formatPercent(urnasApuradas / 100, 0);
}

export function describeVencedor(
  shareA: number,
  nomeA: string,
  nomeB: string,
): string {
  const vencedor = shareA >= 0.5 ? nomeA : nomeB;
  return `${vencedor} venceu com ${formatPercent(Math.max(shareA, 1 - shareA))} dos votos válidos`;
}

export function formatNomeCandidato(nome: string): string {
  return nome
    .toLocaleLowerCase("pt-BR")
    .split(" ")
    .map((part) =>
      part.length > 2
        ? part[0].toLocaleUpperCase("pt-BR") + part.slice(1)
        : part,
    )
    .join(" ");
}
