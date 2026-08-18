"use client";

import { siglaUfEnum } from "@vota-comigo/shared-types";
import type { SiglaUf } from "@vota-comigo/shared-types";
import { useState } from "react";

import { Button } from "@/shared/ui";

const UF_OPTIONS = siglaUfEnum.options;

type StepLocalProps = {
  siglaUf: SiglaUf | null;
  onConfirm: (siglaUf: SiglaUf) => void;
};

export function StepLocal({ siglaUf, onConfirm }: StepLocalProps) {
  const [uf, setUf] = useState<SiglaUf | "">(siglaUf ?? "");

  return (
    <form
      className="grid gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (uf === "") return;
        onConfirm(uf);
      }}
    >
      <label className="grid gap-2" htmlFor="matcher-uf">
        <span className="text-sm font-[650] leading-[1.3] text-ink">
          Estado
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
