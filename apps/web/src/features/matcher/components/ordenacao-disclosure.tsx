export function OrdenacaoDisclosure() {
  return (
    <details className="group rounded-md border border-border bg-surface-muted text-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 font-[650] text-ink [&::-webkit-details-marker]:hidden">
        <span>Como ordenamos os resultados</span>
        <svg
          aria-hidden="true"
          className="shrink-0 transition-transform group-open:rotate-180"
          fill="none"
          height="16"
          viewBox="0 0 16 16"
          width="16"
        >
          <path
            d="M4 6l4 4 4-4"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
          />
        </svg>
      </summary>
      <div className="grid gap-2 border-t border-border px-4 py-3 leading-normal text-muted">
        <p>
          A ordem segue a confiabilidade estatística da compatibilidade: usamos o limite inferior
          do intervalo de Wilson, que penaliza deputados com poucos votos comparados mesmo que
          tenham percentual alto.
        </p>
        <p>
          Isso significa que uma compatibilidade alta com amostra pequena não necessariamente lidera
          a lista. O valor exibido é a compatibilidade bruta; o critério de ordenação não é exibido.
        </p>
      </div>
    </details>
  );
}
