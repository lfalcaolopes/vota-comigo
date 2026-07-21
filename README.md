# Quem Vota Comigo

A political transparency platform that helps Brazilian citizens compare federal deputies based on their actual voting records in the Congress.

<p align="center">
  <a href="https://www.quemvotacomigo.com.br">Open application</a>
</p>

<img width="1843" height="910" alt="Quem Vota Comigo" src="https://github.com/user-attachments/assets/43a094a0-5abe-49e6-8051-c9a9d588a208" />

## About the project

Voting data from the Brazilian Congress is publicly available, but it is spread across APIs, CSV files, and lengthy documents, making it difficult to quickly understand what each proposal is about and how lawmakers voted.

Quem Vota Comigo organizes this data into a more accessible experience and uses AI to turn the full text of legislative proposals into clear summaries that are reviewed before publication. The platform also allows users to explore votes, review deputies' voting records, compare congressman, and discover which representatives are most aligned with their choices.

### Features

* Proposal feed with search, filters, and AI-generated summaries.
* Proposal details and related voting sessions.
* Congressman profiles with voting history and attendance data.
* Compatibility matcher between users and Congressmen.
* Side-by-side comparison of up to three Congressmen.
* Custom data ingestion pipeline for Congress data.

## Documentation

| Document                                             | Description                    |
| ---------------------------------------------------- | ------------------------------ |
| [`CONTEXT.md`](CONTEXT.md)                           | Domain context and vocabulary. |
| [`docs/mvp.md`](docs/mvp.md)                         | MVP scope.                     |
| [`docs/modelagem-dados.md`](docs/modelagem-dados.md) | Database model.                |
| [`docs/adr/`](docs/adr/)                             | Architecture decisions.        |
| [`docs/ingestion/`](docs/ingestion/)                 | Data pipeline documentation.   |

## Processed data

The current database consolidates public data covering the period from 2015 to 2026.

| Metric                        |    Volume |
| ----------------------------- | --------: |
| Individual votes              | 1,546,839 |
| Plenary voting sessions       |     3,898 |
| Registered deputies           |     2,324 |
| Parliamentary history records |    21,520 |
| Legislative proposals         |     1,271 |

## Technologies

* **Frontend:** Next.js 16, React 19, TypeScript, and Tailwind CSS.
* **Backend:** NestJS 11, Node.js, and Zod.
* **Data:** PostgreSQL, Neon, and Drizzle ORM.
* **Infrastructure:** Google Cloud Run, Vercel, Docker, and GitHub Actions.
* **Observability:** Sentry.
* **Testing:** Jest, Vitest, and Playwright.
* **Monorepo:** Turborepo and pnpm.

## Running locally

### Requirements

* Node.js 20+
* pnpm 9
* Docker and Docker Compose

### Installation

```bash
git clone https://github.com/lfalcaolopes/vota-comigo.git
cd vota-comigo
pnpm install
```

Configure the environment variables:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

Start the database, run the migrations, and launch the project:

```bash
pnpm db:up
pnpm db:migrate
pnpm dev
```

### Importing data

To download and import a smaller date range from the Chamber of Deputies datasets:

```bash
pnpm download:csvs -- --from=2025 --to=2026
pnpm ingest -- --from=2025 --to=2026
```

## Tests

```bash
pnpm test
pnpm test:e2e
```

Specific commands:

```bash
pnpm --filter api test
pnpm --filter api test:cov
pnpm --filter web test
pnpm test:e2e:ui
```

## Author

**Lucas Falcão Lopes**

* [GitHub](https://github.com/lfalcaolopes)
* [LinkedIn](https://www.linkedin.com/in/lfalcaolopes/)
* [Email](mailto:lfalcaolopes.dev@gmail.com)

## Data sources

The data comes from the official Open Data API and CSV files published by the Brazilian Congress.

This project is not affiliated with the Congress, any political party, or any Congressman.
