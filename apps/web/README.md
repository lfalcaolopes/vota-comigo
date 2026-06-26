# web

Front-end do Quem Vota Comigo (Next.js App Router). Estrutura e convenções em `CLAUDE.md`.

## Desenvolvimento

```bash
pnpm install
pnpm --filter web dev
```

A aplicação consome a API do back-end. Configure as variáveis de ambiente a partir de `.env.example`:

```bash
cp .env.example .env.local
```

| Variável | Descrição |
| --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | URL base da API. Sem ela, o cliente usa `http://localhost:3001`. |
| `NEXT_PUBLIC_SITE_URL` | URL pública do site, usada em `metadataBase`, OpenGraph, `robots` e `sitemap`. Obrigatória em produção. |

## Scripts

| Script | Ação |
| --- | --- |
| `pnpm --filter web dev` | Servidor de desenvolvimento. |
| `pnpm --filter web build` | Build de produção. |
| `pnpm --filter web start` | Servidor de produção (após o build). |
| `pnpm --filter web test` | Testes unitários (Vitest). |
| `pnpm --filter web test:e2e` | Testes end-to-end (Playwright). |
| `pnpm --filter web lint` | ESLint. |
