"use client";

import { useEffect, useId, useRef, useState } from "react";

import { ChevronDownIcon } from "@/shared/ui";

const LIMITE_CARACTERES_PADRAO = 110;

type ProposicaoResumoProps = {
  clampClassName?: string;
  className?: string;
  identificador: string;
  limiteCaracteres?: number;
  texto: string;
};

export function ProposicaoResumo({
  clampClassName = "line-clamp-2",
  className = "text-sm leading-normal text-muted",
  identificador,
  limiteCaracteres = LIMITE_CARACTERES_PADRAO,
  texto,
}: ProposicaoResumoProps) {
  const [expandido, setExpandido] = useState(false);
  const [podeExpandir, setPodeExpandir] = useState(
    texto.length > limiteCaracteres,
  );
  const textoRef = useRef<HTMLParagraphElement>(null);
  const textoId = useId();

  useEffect(() => {
    const paragrafo = textoRef.current;
    if (!paragrafo || expandido) return;

    // o comprimento do texto so aproxima o corte real, que depende da largura da coluna
    const medir = () =>
      setPodeExpandir(paragrafo.scrollHeight > paragrafo.clientHeight + 1);

    medir();
    const observer = new ResizeObserver(medir);
    observer.observe(paragrafo);

    return () => observer.disconnect();
  }, [expandido, texto]);

  return (
    <div className="grid justify-items-start">
      <p
        className={expandido ? className : `${className} ${clampClassName}`}
        id={textoId}
        ref={textoRef}
      >
        {texto}
      </p>
      {podeExpandir ? (
        <button
          aria-controls={textoId}
          aria-expanded={expandido}
          aria-label={`${expandido ? "Ver menos" : "Ver mais"} do resumo de ${identificador}`}
          className="mt-0.5 inline-flex items-center gap-1 text-sm leading-normal text-subtle transition-colors duration-[140ms] ease-standard hover:text-ink"
          onClick={() => setExpandido((atual) => !atual)}
          type="button"
        >
          {expandido ? "Ver menos" : "Ver mais"}
          <ChevronDownIcon
            aria-hidden="true"
            className={expandido ? "rotate-180" : undefined}
          />
        </button>
      ) : null}
    </div>
  );
}
