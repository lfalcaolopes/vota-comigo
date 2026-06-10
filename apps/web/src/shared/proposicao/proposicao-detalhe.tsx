import type {
  ProposicaoDetalhe as ProposicaoDetalheData,
  ProposicaoStatusResumo,
  TemaOficial,
} from "@vota-comigo/shared-types";

import { formatShortDate, toIdentificadorLegislativo } from "./presentation";

export function ProposicaoDetalhe({
  proposicao,
}: {
  proposicao: ProposicaoDetalheData;
}) {
  const identificador = toIdentificadorLegislativo(proposicao);

  return (
    <div className="grid gap-8">
      <header className="grid gap-3">
        <p className="font-mono text-sm font-[650] tracking-[-0.01em] text-subtle">
          {identificador ?? "Sem identificador"}
        </p>
        {proposicao.ementa ? (
          <h1 className="text-xl leading-snug text-pretty text-ink md:text-2xl">
            {proposicao.ementa}
          </h1>
        ) : null}
      </header>

      {proposicao.ementaDetalhada ? (
        <section className="grid gap-2">
          <h2 className="text-xs font-medium tracking-wide text-subtle uppercase">
            Ementa detalhada
          </h2>
          <p className="text-base leading-relaxed text-pretty text-muted">
            {proposicao.ementaDetalhada}
          </p>
        </section>
      ) : null}

      <Metadados
        status={proposicao.status}
        temas={proposicao.temas}
        fonteOficial={proposicao.fonteOficial}
      />
    </div>
  );
}

function Metadados({
  status,
  temas,
  fonteOficial,
}: {
  status: ProposicaoStatusResumo;
  temas: TemaOficial[];
  fonteOficial: string;
}) {
  return (
    <section className="grid gap-6 border-t border-border pt-6">
      <TramitacaoAtual status={status} />
      <TemasOficiais temas={temas} />
      <FonteOficialLink href={fonteOficial} />
    </section>
  );
}

function TramitacaoAtual({ status }: { status: ProposicaoStatusResumo }) {
  const data = formatShortDate(status.dataHora);

  return (
    <div className="grid gap-3">
      <h2 className="text-xs font-medium tracking-wide text-subtle uppercase">
        Tramitação atual
      </h2>
      <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
        <StatusItem label="Órgão">{status.siglaOrgao}</StatusItem>
        <StatusItem label="Situação">{status.situacao}</StatusItem>
        <StatusItem label="Regime">{status.regime}</StatusItem>
        <StatusItem label="Data" mono>
          {data}
        </StatusItem>
      </dl>
    </div>
  );
}

function StatusItem({
  children,
  label,
  mono = false,
}: {
  children: React.ReactNode;
  label: string;
  mono?: boolean;
}) {
  return (
    <div className="grid gap-1">
      <dt className="text-xs text-subtle">{label}</dt>
      <dd
        className={
          mono
            ? "font-mono text-sm text-muted"
            : "text-sm font-medium text-muted"
        }
      >
        {children ?? "—"}
      </dd>
    </div>
  );
}

function TemasOficiais({ temas }: { temas: TemaOficial[] }) {
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

function FonteOficialLink({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="justify-self-start text-sm text-info underline-offset-2 hover:underline"
    >
      Ver fonte oficial na Câmara
    </a>
  );
}
