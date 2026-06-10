import {
  Badge,
  Button,
  Checkbox,
  Chip,
  EmptyState,
  IconButton,
  InlineMessage,
  Panel,
  Radio,
  SearchField,
  SegmentedControl,
  SkeletonRows,
  SourceLink,
  Switch,
  Tabs,
  TextField,
} from "@/shared/ui";

const colorTokens = [
  ["bg", "oklch(1 0 0)", "var(--color-bg)"],
  ["surface", "oklch(0.985 0.002 48)", "var(--color-surface)"],
  [
    "surface-muted",
    "oklch(0.964 0.004 48)",
    "var(--color-surface-muted)",
  ],
  ["border", "oklch(0.895 0.006 48)", "var(--color-border)"],
  ["ink", "oklch(0.205 0.012 48)", "var(--color-ink)"],
  ["muted", "oklch(0.455 0.018 48)", "var(--color-muted)"],
  ["primary", "oklch(0.58 0.145 47.7)", "var(--color-primary)"],
  [
    "primary-soft",
    "oklch(0.945 0.0285 47.7)",
    "var(--color-primary-soft)",
  ],
  ["info", "oklch(0.55 0.115 235)", "var(--color-info)"],
  ["success", "oklch(0.52 0.12 150)", "var(--color-success)"],
  ["warning", "oklch(0.66 0.1339 72)", "var(--color-warning)"],
  ["danger", "oklch(0.56 0.16 28)", "var(--color-danger)"],
] as const;

const tabItems = [
  { id: "tokens", label: "Tokens" },
  { id: "primitives", label: "Primitivos" },
  { id: "states", label: "Estados" },
];

const segmentedItems = [
  { id: "uf", label: "Estado" },
  { id: "brasil", label: "Brasil" },
  { id: "comparar", label: "Comparar" },
];

export default function Home() {
  return (
    <main className="vc-shell">
      <div className="vc-page">
        <header className="vc-page__header">
          <p className="vc-kicker">Design-system foundation</p>
          <h1 className="vc-heading">Primitivos para uma interface cívica clara.</h1>
          <p className="vc-subhead">
            Tokens e componentes base para construir matcher, ranking, perfis e
            comparativos com consistência visual, contraste forte e estados
            acessíveis.
          </p>
        </header>

        <div className="vc-foundation">
          <aside className="vc-foundation__nav">
            <Panel title="Direção">
              <div className="vc-badge-row">
                <Badge tone="info">Linear precision</Badge>
                <Badge tone="neutral">Stripe Docs polish</Badge>
                <Badge tone="success">Datawrapper trust</Badge>
              </div>
              <p className="vc-message__body">
                Branco puro, tinta grafite, bordas neutras e âmbar cívico usado
                apenas para ação, foco e seleção.
              </p>
              <SourceLink href="https://dadosabertos.camara.leg.br">
                Fonte oficial
              </SourceLink>
            </Panel>
          </aside>

          <div className="vc-grid">
            <Panel title="Cores">
              <div className="vc-grid vc-grid--three">
                {colorTokens.map(([name, value, color]) => (
                  <article className="vc-token-swatch" key={name}>
                    <div
                      aria-label={`Amostra de cor ${name}`}
                      className="vc-token-swatch__color"
                      style={{ background: color }}
                    />
                    <div>
                      <p className="vc-token-swatch__name">{name}</p>
                      <p className="vc-token-swatch__value">{value}</p>
                    </div>
                  </article>
                ))}
              </div>
            </Panel>

            <div className="vc-grid vc-grid--two">
              <Panel title="Ações">
                <div className="vc-button-row">
                  <Button variant="primary">Iniciar matcher</Button>
                  <Button variant="secondary">Limpar filtros</Button>
                  <Button variant="ghost">Ver metodologia</Button>
                  <IconButton label="Abrir filtros">
                    <FilterIcon />
                  </IconButton>
                  <Button disabled variant="primary">
                    Carregando
                  </Button>
                </div>
              </Panel>

              <Panel title="Campos">
                <SearchField
                  helperText="Busque por nome civil ou nome parlamentar."
                  id="search-deputado"
                  label="Buscar deputado"
                  placeholder="Ex.: Aécio Neves"
                />
                <TextField
                  error="Informe uma UF válida para continuar."
                  id="uf"
                  label="Estado"
                  placeholder="Ex.: MG"
                />
              </Panel>
            </div>

            <div className="vc-grid vc-grid--two">
              <Panel title="Seleção">
                <div className="vc-chip-set" role="group" aria-label="Filtros">
                  <Chip selected>Proposições</Chip>
                  <Chip>Deputados</Chip>
                  <Chip>Partidos</Chip>
                  <Chip disabled>Comissões</Chip>
                </div>
                <Tabs activeId="tokens" items={tabItems} label="Seções" />
                <SegmentedControl
                  activeId="uf"
                  items={segmentedItems}
                  label="Escopo de visualização"
                />
              </Panel>

              <Panel title="Controles">
                <Checkbox defaultChecked label="Selecionar proposições relevantes" />
                <Radio defaultChecked label="Mostrar deputados do meu estado" name="scope" />
                <Radio label="Mostrar todos os deputados" name="scope" />
                <Switch defaultChecked label="Exibir fontes oficiais" />
              </Panel>
            </div>

            <Panel title="Estados">
              <div className="vc-grid vc-grid--two">
                <InlineMessage
                  body="Não foi possível carregar os votos. Tente novamente antes de concluir a comparação."
                  title="Erro ao carregar votos"
                  tone="danger"
                />
                <EmptyState
                  action={<Button variant="secondary">Selecionar proposições</Button>}
                  body="A comparação precisa de pelo menos uma proposição com votação nominal."
                  title="Sem dados suficientes"
                />
              </div>
              <div className="vc-badge-row">
                <Badge>Amostra neutra</Badge>
                <Badge tone="info">Fonte Câmara</Badge>
                <Badge tone="success">Compatibilidade alta</Badge>
                <Badge tone="warning">Amostra baixa</Badge>
                <Badge tone="danger">Erro de fonte</Badge>
              </div>
              <SkeletonRows />
            </Panel>
          </div>
        </div>
      </div>
    </main>
  );
}

function FilterIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 18 18" width="18">
      <path
        d="M3 4.5h12M5.25 9h7.5M7.5 13.5h3"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}
