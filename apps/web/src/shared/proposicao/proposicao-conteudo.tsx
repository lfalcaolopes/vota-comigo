import type {
  ProposicaoDetalhe as ProposicaoDetalheData,
  TemaOficial,
} from "@vota-comigo/shared-types";

import { SparklesIcon } from "../ui";

export function ResumoIa({
  proposicao,
}: {
  proposicao: ProposicaoDetalheData;
}) {
  if (!proposicao.resumoIaDisponivel || !proposicao.resumoIaDetalhe) {
    return null;
  }

  const bullets = parseResumoBullets(proposicao.resumoIaDetalhe);

  return (
    <section className="grid gap-3 rounded-lg border border-border bg-surface p-5">
      <h2 className="flex items-center gap-2 text-xs font-medium tracking-wide text-subtle uppercase">
        <SparklesIcon aria-hidden="true" />
        Resumo por IA
      </h2>
      {proposicao.resumoIaCard ? (
        <p className="text-lg leading-normal text-pretty text-ink">
          {proposicao.resumoIaCard}
        </p>
      ) : null}
      {bullets.length > 1 ? (
        <ul className="grid list-disc gap-2 pl-5 text-lg leading-normal text-pretty text-ink">
          {bullets.map((bullet, index) => (
            <li key={index}>{bullet}</li>
          ))}
        </ul>
      ) : (
        <p className="text-lg leading-normal text-pretty text-ink">
          {proposicao.resumoIaDetalhe}
        </p>
      )}
      <p className="border-t border-border pt-3 text-xs leading-normal text-muted">
        Gerado por IA a partir do texto completo da proposição. Pode conter
        imprecisões; consulte a fonte oficial.
      </p>
    </section>
  );
}

export function EmentaOficial({
  ementa,
  prominent = false,
}: {
  ementa: string;
  prominent?: boolean;
}) {
  return (
    <section className="grid gap-2">
      <h2 className="text-xs font-medium tracking-wide text-subtle uppercase">
        Ementa oficial
      </h2>
      <p
        className={
          prominent
            ? "text-base leading-relaxed font-medium text-pretty text-ink"
            : "text-base leading-relaxed text-pretty text-muted"
        }
      >
        {ementa}
      </p>
    </section>
  );
}

export function EmentaDetalhada({
  ementaDetalhada,
}: {
  ementaDetalhada: string;
}) {
  return (
    <section className="grid gap-2">
      <h2 className="text-xs font-medium tracking-wide text-subtle uppercase">
        Ementa detalhada
      </h2>
      <p className="text-base leading-relaxed text-pretty text-muted">
        {ementaDetalhada}
      </p>
    </section>
  );
}

export function TemasOficiais({ temas }: { temas: TemaOficial[] }) {
  const rotulos = temas
    .map((item) => item.tema)
    .filter((tema): tema is string => tema != null && tema !== "");

  if (rotulos.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-3">
      <h2 className="text-xs font-medium tracking-wide text-subtle uppercase">
        Temas
      </h2>
      <ul className="flex flex-wrap gap-2">
        {rotulos.map((tema) => (
          <li
            key={tema}
            className="rounded-full border border-border bg-surface px-3 py-1 text-sm text-muted"
          >
            {tema}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function LinksOficiais({
  fonteOficial,
  camaraPollResultsUrl,
  urlInteiroTeor,
}: {
  fonteOficial: string;
  camaraPollResultsUrl: string;
  urlInteiroTeor: string | null;
}) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2">
      <LinkOficial href={camaraPollResultsUrl}>Ver enquete pública</LinkOficial>
      <LinkOficial href={fonteOficial}>Ver fonte oficial na Câmara</LinkOficial>
      {urlInteiroTeor ? (
        <LinkOficial href={urlInteiroTeor}>Ver texto completo</LinkOficial>
      ) : null}
    </div>
  );
}

function parseResumoBullets(detalhe: string): string[] {
  return detalhe
    .split("\n")
    .map((line) => line.trim().replace(/^-\s+/, ""))
    .filter((line) => line.length > 0)
    .map(capitalizeFirst);
}

function capitalizeFirst(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function LinkOficial({
  children,
  href,
}: {
  children: React.ReactNode;
  href: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-sm text-info underline-offset-2 hover:underline"
    >
      {children}
    </a>
  );
}
