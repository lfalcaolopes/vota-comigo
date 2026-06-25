type Passo = {
  numero: string;
  titulo: string;
  descricao: string;
};

const passos: Passo[] = [
  {
    numero: "01",
    titulo: "Declare suas posições",
    descricao:
      "Você responde se concorda ou discorda de proposições já votadas na Câmara, resumidas em linguagem comum.",
  },
  {
    numero: "02",
    titulo: "Comparamos com votos reais",
    descricao:
      "Cada resposta é confrontada com o voto nominal registrado por cada deputado federal naquela votação.",
  },
  {
    numero: "03",
    titulo: "Veja a compatibilidade com contexto",
    descricao:
      "O resultado mostra o percentual junto da amostra, da presença e dos casos que ficaram de fora.",
  },
];

export function HomeComoFunciona() {
  return (
    <section
      aria-labelledby="home-como-funciona"
      className="border-b border-border bg-surface-muted"
    >
      <div className="mx-auto grid w-full min-w-0 max-w-5xl gap-8 px-4 py-12 md:py-16">
        <div className="grid max-w-[60ch] gap-3">
          <h2
            className="text-2xl leading-tight font-[700] tracking-[-0.01em] text-balance text-ink"
            id="home-como-funciona"
          >
            Como funciona
          </h2>
          <p className="text-base leading-normal text-muted">
            Três passos. A comparação considera apenas votações computáveis e
            mantém amostra, presença e exclusões à vista.
          </p>
        </div>

        <ol className="grid gap-x-8 gap-y-8 md:grid-cols-3">
          {passos.map((passo) => (
            <li
              className="grid gap-2 border-t border-border-strong pt-4"
              key={passo.numero}
            >
              <span className="font-mono text-lg font-[680] tracking-[-0.01em] text-primary">
                {passo.numero}
              </span>
              <h3 className="text-lg leading-snug font-[680] text-ink">
                {passo.titulo}
              </h3>
              <p className="text-base leading-normal text-pretty text-muted">
                {passo.descricao}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
