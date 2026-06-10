"use client";

import { siglaUfEnum } from "@vota-comigo/shared-types";
import type { SiglaUf } from "@vota-comigo/shared-types";
import { useState } from "react";

import { Button } from "@/shared/ui";

const UF_OPTIONS = siglaUfEnum.options;

type StepLocalProps = {
  siglaUf: SiglaUf | null;
  cidade: string;
  onConfirm: (siglaUf: SiglaUf, cidade: string) => void;
};

export function StepLocal({ siglaUf, cidade, onConfirm }: StepLocalProps) {
  const [uf, setUf] = useState<SiglaUf | "">(siglaUf ?? "");
  const [cidadeValue, setCidadeValue] = useState(cidade);

  return (
    <form
      className="grid gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (uf === "") return;
        onConfirm(uf, cidadeValue);
      }}
    >
      <p className="text-sm leading-normal text-muted">
        Pedimos seu estado para mostrar primeiro os deputados que representam
        você. A cidade é opcional
      </p>

      <label className="grid gap-2" htmlFor="matcher-uf">
        <span className="text-sm font-[650] leading-[1.3] text-ink">
          Estado (UF)
        </span>
        <select
          className="min-h-11 w-full rounded-md border border-border bg-white px-3 py-2.5 text-base text-ink"
          id="matcher-uf"
          onChange={(event) => setUf(event.target.value as SiglaUf | "")}
          required
          value={uf}
        >
          <option disabled value="">
            Selecione seu estado
          </option>
          {UF_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-2" htmlFor="matcher-cidade">
        <span className="text-sm font-[650] leading-[1.3] text-ink">
          Cidade (opcional)
        </span>
        <input
          className="min-h-11 w-full rounded-md border border-border bg-white px-3 py-2.5 text-base text-ink"
          id="matcher-cidade"
          onChange={(event) => setCidadeValue(event.target.value)}
          value={cidadeValue}
        />
      </label>

      <Button
        className="justify-self-start"
        disabled={uf === ""}
        type="submit"
        variant="primary"
      >
        Continuar
      </Button>
    </form>
  );
}
