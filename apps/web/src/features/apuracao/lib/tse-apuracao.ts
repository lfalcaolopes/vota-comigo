import primeiroTurnoData from "../data/primeiro-turno-2026.json";
import type {
  ParcialMunicipio,
  PrimeiroTurnoMunicipio,
  ProjecaoApuracao,
} from "./projecao-apuracao";
import { projectApuracao } from "./projecao-apuracao";

const TSE_BASE = "https://resultados.tse.jus.br/oficial/ele2026";
export const SEGUNDO_TURNO = "6258";
const NUMERO_A = "13";
const NUMERO_B = "22";
const SIGLAS_UF = [
  "ac",
  "al",
  "ap",
  "am",
  "ba",
  "ce",
  "df",
  "es",
  "go",
  "ma",
  "mt",
  "ms",
  "mg",
  "pa",
  "pb",
  "pr",
  "pe",
  "pi",
  "rj",
  "rn",
  "rs",
  "ro",
  "rr",
  "sc",
  "se",
  "sp",
  "to",
  "zz",
];
const CONCURRENCY = 48;

type TseCandidato = { n: string; nmu: string; vap: string };
type TseResultado = {
  dt: string;
  hg: string;
  s: { pst: string };
  carg: { agr: { par: { cand: TseCandidato[] }[] }[] }[];
};
type TseAbrangencia = {
  abr: { tpabr: string; cdabr: string; s: { st: string; pst: string } }[];
};

export type ApuracaoCandidato = {
  numero: string;
  nome: string;
  votos: number;
};

export type ApuracaoSnapshot = {
  tseUpdatedAt: string;
  urnasApuradas: number;
  municipiosApurados: number;
  candidatoA: ApuracaoCandidato;
  candidatoB: ApuracaoCandidato;
  oficialShareA: number;
  urnasApuradasByUf: Record<string, number>;
  projecao: ProjecaoApuracao;
};

const primeiroTurno: Record<string, PrimeiroTurnoMunicipio> =
  Object.fromEntries(
    Object.entries(primeiroTurnoData as Record<string, number[]>).map(
      ([key, [votosValidos, votosA, votosB]]) => [
        key,
        { siglaUf: key.slice(0, 2), votosValidos, votosA, votosB },
      ],
    ),
  );

// Survives across warm invocations, so only municipalities with new sections are refetched.
const parcialCache = new Map<
  string,
  { st: number; parcial: ParcialMunicipio }
>();

async function fetchTse<T>(path: string): Promise<T> {
  const response = await fetch(`${TSE_BASE}/${SEGUNDO_TURNO}/dados/${path}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`TSE ${response.status} em ${path}`);
  return (await response.json()) as T;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from(
    { length: Math.min(CONCURRENCY, items.length) },
    async () => {
      while (next < items.length) {
        const index = next++;
        results[index] = await fn(items[index]);
      }
    },
  );
  await Promise.all(workers);
  return results;
}

function toCandidatos(resultado: TseResultado): Map<string, TseCandidato> {
  const candidatos = new Map<string, TseCandidato>();
  for (const agr of resultado.carg[0].agr) {
    for (const par of agr.par) {
      for (const cand of par.cand) candidatos.set(cand.n, cand);
    }
  }
  return candidatos;
}

function toParcial(resultado: TseResultado): ParcialMunicipio {
  const candidatos = toCandidatos(resultado);
  return {
    votosA: Number(candidatos.get(NUMERO_A)?.vap ?? 0),
    votosB: Number(candidatos.get(NUMERO_B)?.vap ?? 0),
  };
}

function parseDecimal(value: string): number {
  return Number(value.replace(",", "."));
}

async function refreshParciais(): Promise<void> {
  const abrangencias = await mapWithConcurrency(SIGLAS_UF, (siglaUf) =>
    fetchTse<TseAbrangencia>(
      `${siglaUf}/${siglaUf}-e00${SEGUNDO_TURNO}-ab.json`,
    ).then((ab) => ({ siglaUf, ab })),
  );

  const changed = abrangencias.flatMap(({ siglaUf, ab }) =>
    ab.abr
      .filter((municipio) => municipio.tpabr === "mun")
      .map((municipio) => ({
        siglaUf,
        cdabr: municipio.cdabr,
        key: `${siglaUf}${municipio.cdabr}`,
        st: Number(municipio.s.st),
      }))
      .filter(({ key, st }) => st > 0 && parcialCache.get(key)?.st !== st),
  );

  await mapWithConcurrency(changed, async ({ siglaUf, cdabr, key, st }) => {
    try {
      const resultado = await fetchTse<TseResultado>(
        `${siglaUf}/${siglaUf}${cdabr}-c0001-e00${SEGUNDO_TURNO}-u.json`,
      );
      parcialCache.set(key, { st, parcial: toParcial(resultado) });
    } catch {
      // keep the previous parcial; the next refresh retries this municipality
    }
  });
}

export async function loadApuracaoSnapshot(): Promise<ApuracaoSnapshot> {
  await refreshParciais();
  const [brasil, abrangenciaUfs] = await Promise.all([
    fetchTse<TseResultado>(`br/br-c0001-e00${SEGUNDO_TURNO}-u.json`),
    fetchTse<TseAbrangencia>(`br/br-e00${SEGUNDO_TURNO}-ab.json`),
  ]);
  const candidatos = toCandidatos(brasil);
  const toCandidato = (numero: string): ApuracaoCandidato => {
    const candidato = candidatos.get(numero);
    return {
      numero,
      nome: candidato?.nmu ?? numero,
      votos: Number(candidato?.vap ?? 0),
    };
  };
  const candidatoA = toCandidato(NUMERO_A);
  const candidatoB = toCandidato(NUMERO_B);
  const oficialTotal = candidatoA.votos + candidatoB.votos;

  const parciais = Object.fromEntries(
    [...parcialCache.entries()].map(([key, { parcial }]) => [key, parcial]),
  );

  return {
    tseUpdatedAt: `${brasil.dt} ${brasil.hg}`,
    urnasApuradas: parseDecimal(brasil.s.pst),
    municipiosApurados: parcialCache.size,
    candidatoA,
    candidatoB,
    oficialShareA: oficialTotal > 0 ? candidatoA.votos / oficialTotal : 0,
    urnasApuradasByUf: Object.fromEntries(
      abrangenciaUfs.abr
        .filter((uf) => uf.tpabr === "uf")
        .map((uf) => [uf.cdabr, parseDecimal(uf.s.pst)]),
    ),
    projecao: projectApuracao(primeiroTurno, parciais),
  };
}
