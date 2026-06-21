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

| Doc                                                           | Descrição                                                                                    |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| [CONTEXT.md](CONTEXT.md)                                      | Vocabulário canônico e contexto de domínio do produto.                                       |
| [prototipo](docs/prototipo.md)                                | Fase de protótipo: viabilidade dos dados, coerência da modelagem e da fórmula de relevância. |
| [mvp](docs/mvp.md)                                            | Escopo do MVP: as features mínimas que entregam valor ao cidadão.                            |
| [melhorias](docs/melhorias.md)                                | Melhorias pós-MVP, priorizadas em tiers.                                                     |
| [modelagem-dados](docs/modelagem-dados.md)                    | Modelagem relacional da base ingerida da Câmara e derivados.                                 |
| [docs/adr/](docs/adr/)                                        | Architecture Decision Records: decisões de domínio e arquitetura.                            |
| [csv-downloader](docs/ingestion/camara-csv-downloader.md)     | Contrato operacional do downloader de CSVs da Câmara.                                        |
| [runner-ingestao](docs/ingestion/pipeline-runner-ingestao.md) | Contrato operacional do runner de ingestão.                                                  |
| [resumos-ia](docs/ingestion/proposicao-resumo-ia.md)          | Contrato operacional dos resumos por IA de proposições.                                      |

## Testes

```bash
pnpm --filter api test          # unitários
pnpm --filter api test:cov      # com cobertura
```
