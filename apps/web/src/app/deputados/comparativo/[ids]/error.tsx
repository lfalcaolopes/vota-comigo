"use client";

import { ErrorState } from "@/shared/ui";

export default function ComparativoDeputadosError({
  reset,
}: {
  reset: () => void;
}) {
  return (
    <main className="min-h-screen w-full min-w-0 overflow-x-hidden bg-bg text-ink">
      <div className="mx-auto grid w-full min-w-0 max-w-5xl gap-8 px-4 pt-8 pb-16 md:pt-12">
        <ErrorState
          body="Não foi possível carregar a comparação. Tente novamente."
          onRetry={reset}
        />
      </div>
    </main>
  );
}
