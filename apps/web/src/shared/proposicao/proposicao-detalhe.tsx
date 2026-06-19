import type {
  ProposicaoDetalhe as ProposicaoDetalheData,
  ProposicaoStatusResumo,
  TemaOficial,
} from "@vota-comigo/shared-types";

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

      <ResumoIa proposicao={proposicao} />

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
        proposicao={proposicao}
        status={proposicao.status}
        temas={proposicao.temas}
        fonteOficial={proposicao.fonteOficial}
        urlInteiroTeor={proposicao.urlInteiroTeor}
      />

      <section className="grid gap-6 border-t border-border pt-6">
        <Votacoes votacoes={proposicao.votacoes} />
      </section>
    </div>
  );
}

function ResumoIa({ proposicao }: { proposicao: ProposicaoDetalheData }) {
  if (!proposicao.resumoIaDisponivel || !proposicao.resumoIaDetalhe) {
    return null;
  }

  return (
    <section className="grid gap-2">
      <h2 className="text-xs font-medium tracking-wide text-subtle uppercase">
        Resumo por IA
      </h2>
      <p className="text-base leading-relaxed text-pretty text-muted">
        {proposicao.resumoIaDetalhe}
      </p>
    </section>
  );
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
    <section className="grid gap-6 border-t border-border pt-6">
      <Estatisticas proposicao={proposicao} />
      <TramitacaoAtual status={status} />
      <TemasOficiais temas={temas} />
      <LinksOficiais
        fonteOficial={fonteOficial}
        urlInteiroTeor={urlInteiroTeor}
      />
    </section>
  );
}

function Estatisticas({
  proposicao,
}: {
  proposicao: ProposicaoDetalheData;
}) {
  const dataUltimaVotacao = maxIsoDate(
    proposicao.votacoes.map((votacao) => votacao.data),
  );
  const ultimaVotacao = formatDateWithRelativeTime(dataUltimaVotacao);

  return (
    <div className="grid gap-3">
      <h2 className="text-xs font-medium tracking-wide text-subtle uppercase">
        Estatísticas
      </h2>
      <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
        <StatusItem label="Total de votações nominais" mono>
          {proposicao.votacoes.length}
        </StatusItem>
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
      <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
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
  urlInteiroTeor,
}: {
  fonteOficial: string;
  urlInteiroTeor: string | null;
}) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2">
      {urlInteiroTeor ? (
        <LinkOficial href={urlInteiroTeor}>Ver PDF da proposição</LinkOficial>
      ) : null}
      <LinkOficial href={fonteOficial}>Ver fonte oficial na Câmara</LinkOficial>
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
