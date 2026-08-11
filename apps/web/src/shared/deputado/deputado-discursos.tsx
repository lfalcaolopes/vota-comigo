"use client";

import type {
  DeputadoDiscurso,
  DeputadoDiscursoLink,
  DeputadoDiscursosResponse,
} from "@vota-comigo/shared-types";
import { useId, useState } from "react";

import { InlineMessage, SkeletonRows, SourceLink } from "@/shared/ui";

import { formatData } from "./presentation";
import type { DeputadoYearCacheState } from "./use-deputado-year-cache";

export type DiscursosState = DeputadoYearCacheState<DeputadoDiscursosResponse>;

export function DeputadoDiscursosSection({ state }: { state: DiscursosState }) {
  return (
    <section aria-labelledby="deputado-discursos-title" className="grid gap-5">
      <div className="grid max-w-[70ch] gap-2 border-t border-border pt-6">
        <h3
          className="text-lg font-[680] leading-snug text-ink text-balance"
          id="deputado-discursos-title"
        >
          Discursos
        </h3>
        <p className="text-sm leading-normal text-muted text-pretty">
          Pronunciamentos registrados pela Câmara. O sumário e os assuntos são
          informações da própria Câmara.
        </p>
      </div>
      {state.status === "loading" ? <SkeletonRows count={3} /> : null}
      {state.status === "error" ? (
        <InlineMessage
          body="Tente novamente mais tarde. O restante do perfil continua disponível."
          title="Não foi possível carregar os discursos agora."
          tone="danger"
        />
      ) : null}
      {state.status === "success" && state.response.items.length === 0 ? (
        <InlineMessage
          body="Não há pronunciamentos disponíveis para este ano."
          title="Nenhum discurso encontrado"
        />
      ) : null}
      {state.status === "success" && state.response.items.length > 0 ? (
        <DiscursosList items={state.response.items} />
      ) : null}
    </section>
  );
}

function DiscursosList({ items }: { items: readonly DeputadoDiscurso[] }) {
  return (
    <div className="divide-y divide-border border-y border-border">
      {items.map((item, index) => (
        <DiscursoItem
          item={item}
          key={`${item.dataHoraInicio}-${item.tipoDiscurso}-${index}`}
        />
      ))}
    </div>
  );
}

function DiscursoItem({ item }: { item: DeputadoDiscurso }) {
  return (
    <article className="grid min-w-0 gap-4 py-5">
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <time className="font-[650] text-ink" dateTime={item.dataHoraInicio}>
          {formatData(item.dataHoraInicio)}
        </time>
        <span className="text-muted">{item.tipoDiscurso}</span>
        {item.fase !== null ? (
          <span className="text-muted">Fase: {item.fase}</span>
        ) : null}
      </div>
      {item.sumario !== null ? (
        <DiscursoSummary summary={item.sumario} />
      ) : null}
      {item.assuntos.length > 0 ? (
        <div className="grid min-w-0 gap-2">
          <p className="text-sm font-[650] text-ink">
            Assuntos informados pela Câmara
          </p>
          <ul className="flex min-w-0 flex-wrap gap-2">
            {item.assuntos.map((assunto) => (
              <li
                className="max-w-full rounded-full bg-surface-muted px-2.5 py-1 text-sm text-muted [overflow-wrap:anywhere]"
                key={assunto.toLocaleLowerCase("pt-BR")}
              >
                {assunto}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {item.links.length > 0 ? <DiscursoLinks links={item.links} /> : null}
    </article>
  );
}

function DiscursoSummary({ summary }: { summary: string }) {
  const [expanded, setExpanded] = useState(false);
  const contentId = useId();
  const preview = toSummaryPreview(summary);
  if (preview === summary) {
    return (
      <p className="max-w-[70ch] text-sm leading-normal text-ink">{summary}</p>
    );
  }

  return (
    <div className="grid max-w-[70ch] gap-1">
      <p className="text-sm leading-normal text-ink" id={contentId}>
        {expanded ? summary : preview}
      </p>
      <button
        aria-controls={contentId}
        aria-expanded={expanded}
        className="inline-flex min-h-11 items-center justify-self-start rounded-sm py-2 text-sm font-[650] text-info underline decoration-info/35 underline-offset-[0.18em]"
        onClick={() => setExpanded((current) => !current)}
        type="button"
      >
        {expanded ? "Recolher sumário" : "Ler sumário completo"}
      </button>
    </div>
  );
}

function DiscursoLinks({ links }: { links: readonly DeputadoDiscursoLink[] }) {
  return (
    <ul className="flex min-w-0 flex-wrap gap-x-5 gap-y-2">
      {links.map((link) => (
        <li className="min-w-0" key={link.kind}>
          <SourceLink href={link.url} rel="noreferrer" target="_blank">
            {linkLabel(link.kind)}
          </SourceLink>
        </li>
      ))}
    </ul>
  );
}

function linkLabel(kind: DeputadoDiscursoLink["kind"]): string {
  if (kind === "video") return "Assistir discurso na Câmara";
  if (kind === "audio") return "Ouvir discurso na Câmara";
  return "Ler discurso na Câmara";
}

function toSummaryPreview(summary: string): string {
  const maxLength = 280;
  if (summary.length <= maxLength) return summary;

  const candidate = summary.slice(0, maxLength + 1);
  const sentenceEnd = Math.max(
    candidate.lastIndexOf(". "),
    candidate.lastIndexOf("? "),
    candidate.lastIndexOf("! "),
  );
  const boundary =
    sentenceEnd >= Math.floor(maxLength * 0.6)
      ? sentenceEnd + 1
      : candidate.lastIndexOf(" ", maxLength);
  return `${candidate.slice(0, Math.max(boundary, 1)).trim()}…`;
}
