import type {
  ProposicaoDetalhe as ProposicaoDetalheData,
  ProposicaoStatusResumo,
  TemaOficial,
} from "@vota-comigo/shared-types";

import { SparklesIcon } from "../ui";
import { Votacoes } from "../votacao/votacoes";
import {
  formatDateWithRelativeTime,
  formatShortDate,
  maxIsoDate,
  toIdentificadorLegislativo,
} from "./presentation";

export function ProposicaoDetalhe({
  proposicao,
}: {
  proposicao: ProposicaoDetalheData;
}) {
  const identificador = toIdentificadorLegislativo(proposicao);
  const temResumoIa = Boolean(
    proposicao.resumoIaDisponivel && proposicao.resumoIaDetalhe,
  );

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-start lg:gap-12">
      <div className="grid min-w-0 gap-8">
        <header>
          <h1 className="font-mono text-base font-[650] tracking-[-0.01em] text-ink md:text-lg">
            {identificador ?? "Sem identificador"}
          </h1>
        </header>

        {temResumoIa ? <ResumoIa proposicao={proposicao} /> : null}

        {proposicao.ementa ? (
          <EmentaOficial ementa={proposicao.ementa} prominent={!temResumoIa} />
        ) : null}

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

        <section className="grid gap-6 border-t border-border pt-6">
          <Votacoes votacoes={proposicao.votacoes} />
        </section>
      </div>

      <aside className="grid gap-6 border-t border-border pt-6 lg:border-t-0 lg:border-l lg:border-border lg:pt-0 lg:pl-8">
        <Metadados
          proposicao={proposicao}
          status={proposicao.status}
          temas={proposicao.temas}
          fonteOficial={proposicao.fonteOficial}
          urlInteiroTeor={proposicao.urlInteiroTeor}
        />
      </aside>
    </div>
  );
}

function ResumoIa({ proposicao }: { proposicao: ProposicaoDetalheData }) {
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
        Gerado por IA a partir do texto oficial. Pode conter imprecisões;
        consulte a fonte oficial.
      </p>
    </section>
  );
}

function EmentaOficial({
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

function parseResumoBullets(detalhe: string): string[] {
  return detalhe
    .split("\n")
    .map((line) => line.trim().replace(/^-\s+/, ""))
    .filter((line) => line.length > 0);
}

function Metadados({
  proposicao,
  status,
  temas,
  fonteOficial,
  urlInteiroTeor,
}: {
  proposicao: ProposicaoDetalheData;
  status: ProposicaoStatusResumo;
  temas: TemaOficial[];
  fonteOficial: string;
  urlInteiroTeor: string | null;
}) {
  return (
    <>
      <TramitacaoAtual status={status} />
      <Estatisticas proposicao={proposicao} />
      <TemasOficiais temas={temas} />
      <LinksOficiais
        fonteOficial={fonteOficial}
        camaraPollResultsUrl={proposicao.camaraPollResultsUrl}
        urlInteiroTeor={urlInteiroTeor}
      />
    </>
  );
}

function Estatisticas({ proposicao }: { proposicao: ProposicaoDetalheData }) {
  const dataUltimaVotacao = maxIsoDate(
    proposicao.votacoes.map((votacao) => votacao.data),
  );
  const ultimaVotacao = formatDateWithRelativeTime(dataUltimaVotacao);

  return (
    <div className="grid gap-3">
      <h2 className="text-xs font-medium tracking-wide text-subtle uppercase">
        Estatísticas
      </h2>
      <dl className="grid gap-y-3">
        <StatusItem label="Última votação" mono>
          {ultimaVotacao}
        </StatusItem>
      </dl>
    </div>
  );
}

function TramitacaoAtual({ status }: { status: ProposicaoStatusResumo }) {
  const data = formatShortDate(status.dataHora);

  return (
    <div className="grid gap-3">
      <h2 className="text-xs font-medium tracking-wide text-subtle uppercase">
        Tramitação atual
      </h2>
      <dl className="grid gap-y-3">
        <StatusItem label="Situação">{status.situacao}</StatusItem>
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

function LinksOficiais({
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
      <LinkOficial href={camaraPollResultsUrl}>
        Ver enquete pública
      </LinkOficial>
      <LinkOficial href={fonteOficial}>Ver fonte oficial na Câmara</LinkOficial>
      {urlInteiroTeor ? (
        <LinkOficial href={urlInteiroTeor}>Ver PDF da proposição</LinkOficial>
      ) : null}
    </div>
  );
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
