## Frontend structure

All product code lives under `src/`, including the App Router; `src/app/` follows Next.js conventions and holds routing only.

The app has three layers with a one-way dependency rule: `app` imports from `features` and `shared`; `features` import from `shared`, never from each other; `shared` imports from nothing above it.

```txt
apps/web/
  src/
    app/       # routing, layouts, metadata
    features/  # flows with their own behavior
    shared/    # reusable blocks owned by no feature
```

Create a folder only when it has real files.

### app/

Routing only. Route segments keep Next entrypoints — `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`. Pages compose `features` and `shared` and hold no logic of their own. A page that only assembles domain pieces stays here with no matching feature.

### features/

A feature is a self-contained flow (`matcher`, `feed`, `comparativo`). It keeps everything it owns together and exposes a single public surface through `index.ts`; other layers import the barrel, never a file inside it.

- `components/`: UI specific to the feature.
- `hooks/`: feature state and side effects.
- `lib/`: pure logic with no React, such as payload building, validation, and formatting.
- `types.ts`: types used only inside the feature; promote to `shared` when a second consumer appears.
- `index.ts`: the feature's public surface.
- `errors/`, `constants/`: only when the feature needs those responsibilities.

### shared/

Blocks reused across features, split into generic and domain.

- `ui/`: design-system primitives with no domain knowledge, such as `Button`, `Card`, and `Badge`.
- `<conceito>/`: one folder per domain concept (`deputado`, `proposicao`, `votacao`, `partido`), holding its types, presentational components, queries, and hooks. Domain folders consume `ui/`, never the reverse.
- `lib/`: generic helpers with no domain, such as the api client, formatters, and env access.
- `hooks/`: generic hooks, such as `useMediaQuery` and `useDebounce`.

### Conventions

- Cross-feature reuse goes through `shared`, not through another feature.
- `"use client"` stays as close to the leaf as possible; route segments stay server components unless a child needs the client boundary.
- Domain naming follows the repo convention: Portuguese domain nouns without accents, English verbs and helpers.

### Visual verification

- Use Playwright for browser automation and visual verification when the task needs real interaction with the web app.
- Default E2E command from the repo root: `pnpm --filter web test:e2e`. It starts Next on `127.0.0.1:3002` through `playwright.config.ts` when no explicit base URL is provided.
- If a Next dev server is already running, do not start another one. Point Playwright at it with `PLAYWRIGHT_BASE_URL=http://127.0.0.1:<port> pnpm --filter web test:e2e`.
- For headed inspection, use `PLAYWRIGHT_BASE_URL=http://127.0.0.1:<port> pnpm --filter web test:e2e:headed`.
- Next 16 prevents two `next dev` processes for the same app directory; prefer `PLAYWRIGHT_BASE_URL` when reusing an existing server.
- In the Codex sandbox, local port bind/connect may fail with `EPERM`; rerun the Playwright command with sandbox escalation when browser automation is required.
