"use client";

import { useEffect, useId, useRef, useState } from "react";

import { Button, Popover } from "@/shared/ui";

import { buildDeputadosText, type DeputadoTextItem } from "./deputados-text";

const CONFIRMACAO_MS = 2400;

type CopyStatus = "idle" | "copiado" | "manual";

export function CopyDeputadosButton({
  className,
  contexto,
  deputados,
}: {
  className?: string;
  contexto: string | null;
  deputados: readonly DeputadoTextItem[];
}) {
  const panelId = useId();
  const [status, setStatus] = useState<CopyStatus>("idle");
  const [texto, setTexto] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const textoRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (status !== "copiado") return;

    const timer = setTimeout(() => setStatus("idle"), CONFIRMACAO_MS);
    return () => clearTimeout(timer);
  }, [status]);

  const copiar = async () => {
    const proximoTexto = buildDeputadosText({
      deputados,
      contexto,
      salvoEm: new Date(),
    });
    setTexto(proximoTexto);

    try {
      await navigator.clipboard.writeText(proximoTexto);
      setStatus("copiado");
    } catch {
      setStatus("manual");
    }
  };

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          aria-controls={status === "manual" ? panelId : undefined}
          aria-expanded={status === "manual"}
          aria-haspopup="dialog"
          onClick={copiar}
          ref={triggerRef}
        >
          <CopyIcon />
          Copiar em texto
        </Button>
        <span aria-live="polite" className="text-sm text-muted" role="status">
          {status === "copiado" ? "Copiado" : ""}
        </span>
      </div>

      <Popover
        ariaLabel="Copiar a lista manualmente"
        className="grid gap-2 p-4 sm:p-3"
        id={panelId}
        initialFocusRef={textoRef}
        isOpen={status === "manual"}
        mobile="centered"
        onClose={() => setStatus("idle")}
        triggerRef={triggerRef}
        width={360}
      >
        <p className="text-sm leading-normal text-muted">
          Não foi possível copiar por aqui. Selecione o texto e copie
          manualmente.
        </p>
        <textarea
          className="w-full rounded-md border border-border bg-white p-2 font-mono text-xs leading-normal text-ink"
          onFocus={(event) => event.currentTarget.select()}
          readOnly
          ref={textoRef}
          rows={8}
          value={texto}
        />
      </Popover>
    </div>
  );
}

function CopyIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="16"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      viewBox="0 0 16 16"
      width="16"
    >
      <rect height="9" rx="1.5" width="9" x="5.5" y="5.5" />
      <path d="M10.5 3.5v-1a1 1 0 0 0-1-1h-7a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h1" />
    </svg>
  );
}
