"use client";

import { useState } from "react";

import { MATCHER_RASCUNHO_STORAGE_KEY } from "@/features/matcher/lib/matcher-rascunho-storage";
import { FIRST_TOUCH_STORAGE_KEY } from "@/shared/analytics/first-touch";
import { Button } from "@/shared/ui";

type ClearStatus = "idle" | "cleared" | "unavailable";

export function BrowserDataControls() {
  const [status, setStatus] = useState<ClearStatus>("idle");

  function handleClear() {
    try {
      window.localStorage.removeItem(FIRST_TOUCH_STORAGE_KEY);
      window.sessionStorage.removeItem(MATCHER_RASCUNHO_STORAGE_KEY);
      setStatus("cleared");
    } catch {
      setStatus("unavailable");
    }
  }

  return (
    <div className="grid max-w-[72ch] justify-items-start gap-3 rounded-md border border-border bg-surface-muted p-4">
      <div className="grid gap-1">
        <p className="font-[680] text-ink">Controle neste dispositivo</p>
        <p className="text-sm leading-normal text-muted">
          A ação remove o rascunho da comparação e o registro local da origem do
          primeiro acesso. Ela não afeta dados públicos nem registros técnicos
          já agregados. A origem poderá ser registrada novamente em uma visita
          futura.
        </p>
      </div>
      <Button onClick={handleClear}>Apagar dados deste navegador</Button>
      {status !== "idle" ? (
        <p
          aria-live="polite"
          className="text-sm leading-normal text-muted"
          role="status"
        >
          {status === "cleared"
            ? "Os dados locais do Quem Vota Comigo foram apagados neste navegador."
            : "O navegador não permitiu apagar os dados. Use as configurações de privacidade do navegador."}
        </p>
      ) : null}
    </div>
  );
}
