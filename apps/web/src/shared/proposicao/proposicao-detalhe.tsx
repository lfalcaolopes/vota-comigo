import type {
  ProposicaoDetalhe as ProposicaoDetalheData,
  ProposicaoStatusResumo,
  TemaOficial,
} from "@vota-comigo/shared-types";

import { Votacoes } from "../votacao/votacoes";
import {
  EmentaDetalhada,
  EmentaOficial,
  LinksOficiais,
  ResumoIa,
  TemasOficiais,
} from "./proposicao-conteudo";
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
          <EmentaDetalhada ementaDetalhada={proposicao.ementaDetalhada} />
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
