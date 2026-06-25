import { DeputadoAvatar } from "@/shared/deputado";
import { Badge } from "@/shared/ui";
import { joinClassNames } from "@/shared/ui/utils";

type ExemploResultado = {
  nome: string;
  contexto: string;
  percentual: string;
  amostra: string;
};

const exemplos: ExemploResultado[] = [
  {
    nome: "Deputada A",
    contexto: "Partido · UF",
    percentual: "91%",
    amostra: "11 de 12 votações",
  },
  {
    nome: "Deputado B",
    contexto: "Partido · UF",
    percentual: "75%",
    amostra: "9 de 12 votações",
  },
];

export function HomeHeroSample() {
  return (
    <figure
      aria-label="Exemplo de como um resultado de compatibilidade aparece"
      className="grid gap-4 rounded-lg border border-border bg-surface p-5"
    >
      <figcaption className="flex items-center justify-between gap-3">
        <span className="text-sm font-[650] text-ink">
          Como o resultado aparece
        </span>
        <Badge tone="neutral">Exemplo</Badge>
      </figcaption>

      <ul className="grid">
        {exemplos.map((item, index) => (
          <li
            className={joinClassNames(
              "flex items-center gap-3 py-3",
              index > 0 && "border-t border-border",
            )}
            key={item.nome}
          >
            <DeputadoAvatar nome={item.nome} urlFoto={null} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-[650] text-ink">{item.nome}</p>
              <p className="text-sm text-muted">{item.contexto}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end">
              <p className="text-lg leading-none font-[680] tabular-nums text-ink">
                <span className="sr-only">Compatibilidade </span>
                {item.percentual}
              </p>
              <p className="mt-1 text-xs text-muted">{item.amostra}</p>
            </div>
          </li>
        ))}
      </ul>

      <p className="text-xs leading-normal text-muted">
        Todo percentual aparece com a amostra de votações considerada.
      </p>
    </figure>
  );
}
