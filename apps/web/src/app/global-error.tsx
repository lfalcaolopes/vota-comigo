"use client";

import "./globals.css";

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full">
        <main className="grid min-h-screen w-full place-items-center bg-bg px-4 text-ink">
          <div className="grid max-w-150 justify-items-start gap-4 rounded-lg border border-dashed border-border-strong bg-surface p-6">
            <h1 className="text-lg font-bold">Erro inesperado</h1>
            <p className="leading-normal text-muted">
              Não foi possível carregar o Quem Vota Comigo. Tente novamente.
            </p>
            <button
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-border-strong bg-surface px-4 text-sm font-[650] text-ink transition-colors hover:bg-surface-muted"
              onClick={reset}
              type="button"
            >
              Tentar novamente
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
