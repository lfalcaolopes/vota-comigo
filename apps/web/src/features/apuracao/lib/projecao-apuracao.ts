export type PrimeiroTurnoMunicipio = {
  siglaUf: string;
  votosValidos: number;
  votosA: number;
  votosB: number;
};

export type ParcialMunicipio = {
  votosA: number;
  votosB: number;
};

export type ProjecaoUf = {
  siglaUf: string;
  shareA: number;
  expectedVotos: number;
  countedVotos: number;
};

export type ProjecaoApuracao = {
  shareA: number;
  variacaoEntreTurnos: number;
  ufs: ProjecaoUf[];
};

// Votes of UF-local evidence needed before the UF variação weighs as much as the national one.
const SHRINK_VOTOS = 50_000;

function primeiroTurnoShareA(municipio: PrimeiroTurnoMunicipio): number {
  const total = municipio.votosA + municipio.votosB;
  return total > 0 ? municipio.votosA / total : 0.5;
}

function clamp(value: number): number {
  return Math.min(Math.max(value, 0), 1);
}

export function projectApuracao(
  primeiroTurno: Record<string, PrimeiroTurnoMunicipio>,
  parciais: Record<string, ParcialMunicipio>,
): ProjecaoApuracao {
  const variacaoSum = new Map<string, number>();
  const variacaoWeight = new Map<string, number>();

  for (const [key, parcial] of Object.entries(parciais)) {
    const municipio = primeiroTurno[key];
    const counted = parcial.votosA + parcial.votosB;
    if (!municipio || counted === 0) continue;

    const delta =
      (parcial.votosA / counted - primeiroTurnoShareA(municipio)) * counted;
    variacaoSum.set(
      municipio.siglaUf,
      (variacaoSum.get(municipio.siglaUf) ?? 0) + delta,
    );
    variacaoWeight.set(
      municipio.siglaUf,
      (variacaoWeight.get(municipio.siglaUf) ?? 0) + counted,
    );
  }

  const nationalWeight = [...variacaoWeight.values()].reduce(
    (a, b) => a + b,
    0,
  );
  const nationalVariacao =
    nationalWeight > 0
      ? [...variacaoSum.values()].reduce((a, b) => a + b, 0) / nationalWeight
      : 0;

  const variacaoForUf = (siglaUf: string) => {
    const weight = variacaoWeight.get(siglaUf);
    if (weight === undefined) return nationalVariacao;
    return (
      ((variacaoSum.get(siglaUf) ?? 0) + SHRINK_VOTOS * nationalVariacao) /
      (weight + SHRINK_VOTOS)
    );
  };

  const ufTotals = new Map<
    string,
    { votosA: number; total: number; counted: number }
  >();
  let projectedA = 0;
  let projectedTotal = 0;

  for (const [key, municipio] of Object.entries(primeiroTurno)) {
    const parcial = parciais[key] ?? { votosA: 0, votosB: 0 };
    const counted = parcial.votosA + parcial.votosB;
    const remaining = Math.max(municipio.votosValidos - counted, 0);
    const prior = clamp(
      primeiroTurnoShareA(municipio) + variacaoForUf(municipio.siglaUf),
    );
    const countedFraction =
      municipio.votosValidos > 0
        ? Math.min(counted / municipio.votosValidos, 1)
        : 1;
    const observed = counted > 0 ? parcial.votosA / counted : prior;
    const remainingShare =
      countedFraction * observed + (1 - countedFraction) * prior;

    const votosA = parcial.votosA + remaining * remainingShare;
    const total = counted + remaining;
    projectedA += votosA;
    projectedTotal += total;

    const uf = ufTotals.get(municipio.siglaUf) ?? {
      votosA: 0,
      total: 0,
      counted: 0,
    };
    uf.votosA += votosA;
    uf.total += total;
    uf.counted += counted;
    ufTotals.set(municipio.siglaUf, uf);
  }

  return {
    shareA: projectedTotal > 0 ? projectedA / projectedTotal : 0.5,
    variacaoEntreTurnos: nationalVariacao,
    ufs: [...ufTotals.entries()]
      .map(([siglaUf, { votosA, total, counted }]) => ({
        siglaUf,
        shareA: total > 0 ? votosA / total : 0.5,
        expectedVotos: total,
        countedVotos: counted,
      }))
      .sort((a, b) => b.expectedVotos - a.expectedVotos),
  };
}
