# Quem Vota Comigo

Plataforma de transparência política que ajuda cidadãos brasileiros a avaliar deputados federais pelo comportamento real em votações: ranking de proposições votadas, matcher de compatibilidade e comparativo entre políticos. A fonte de dados é a API e os CSVs publicados em `dadosabertos.camara.leg.br`.

Monorepo pnpm + turbo: `apps/api` (backend NestJS + pipeline de ingestão) e `packages/` (tipos e configs compartilhados).

## Setup

```bash
pnpm install
pnpm db:up        # sobe o Postgres de desenvolvimento (docker-compose)
pnpm db:migrate   # aplica o schema
```

A `DATABASE_URL` vem de `apps/api/.env` (ver `apps/api/.env.example`).

## Ingestão

```bash
pnpm download:csvs -- --from=2020 --to=2025   # baixa os CSVs da Câmara
pnpm ingest -- --from=2020 --to=2025          # transforma os CSVs e popula o banco
```

Contratos operacionais detalhados na tabela abaixo.

## Documentação

As grandes docs do projeto. Cada uma referencia, no seu próprio contexto, as docs menores relacionadas.

| Doc | Descrição |
|-----|-----------|
| [CONTEXT.md](CONTEXT.md) | Vocabulário canônico e contexto de domínio do produto. |
| [docs/prototipo.md](docs/prototipo.md) | Fase de protótipo: viabilidade dos dados, coerência da modelagem e da fórmula de relevância. |
| [docs/mvp.md](docs/mvp.md) | Escopo do MVP: as features mínimas que entregam valor ao cidadão. |
| [docs/modelagem-dados.md](docs/modelagem-dados.md) | Modelagem relacional da base ingerida da Câmara e derivados. |
| [docs/melhorias.md](docs/melhorias.md) | Melhorias pós-MVP, priorizadas em tiers. |
| [docs/adr/](docs/adr/) | Architecture Decision Records: decisões de domínio e arquitetura. |
| [docs/ingestion/csv-downloads.md](docs/ingestion/csv-downloads.md) | Contrato operacional do downloader de CSVs da Câmara. |
| [docs/ingestion/runner-ingestao.md](docs/ingestion/runner-ingestao.md) | Contrato operacional do runner de ingestão. |

## Testes

```bash
pnpm --filter api test          # unitários
pnpm --filter api test:cov      # com cobertura
```
