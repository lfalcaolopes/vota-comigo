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
  const [nextRefreshAt, setNextRefreshAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setNextRefreshAt(Date.now() + REFRESH_MS);
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
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      cancelled = true;
      clearInterval(refresh);
      clearInterval(tick);
    };
  }, []);

  const secondsToRefresh = Math.max(0, Math.ceil((nextRefreshAt - now) / 1000));

  return { snapshot, failed, history, secondsToRefresh };
}
