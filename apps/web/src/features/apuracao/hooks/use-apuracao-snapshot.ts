"use client";

import { useEffect, useState } from "react";

import type { ApuracaoSnapshot } from "../lib/tse-apuracao";

const REFRESH_MS = 60_000;

export type ApuracaoHistoryPoint = {
  urnasApuradas: number;
  oficial: number;
  projecao: number;
};

export function useApuracaoSnapshot() {
  const [snapshot, setSnapshot] = useState<ApuracaoSnapshot | null>(null);
  const [failed, setFailed] = useState(false);
  const [history, setHistory] = useState<ApuracaoHistoryPoint[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/laboratorio/apuracao/dados");
        if (!response.ok) throw new Error(String(response.status));
        const next = (await response.json()) as ApuracaoSnapshot;
        if (cancelled) return;
        setSnapshot(next);
        setFailed(false);
        setHistory((previous) =>
          previous.at(-1)?.urnasApuradas === next.urnasApuradas
            ? previous
            : [
                ...previous,
                {
                  urnasApuradas: next.urnasApuradas,
                  oficial: next.oficialShareA * 100,
                  projecao: next.projecao.shareA * 100,
                },
              ],
        );
      } catch {
        if (!cancelled) setFailed(true);
      }
    }

    load();
    const refresh = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(refresh);
    };
  }, []);

  return { snapshot, failed, history };
}
