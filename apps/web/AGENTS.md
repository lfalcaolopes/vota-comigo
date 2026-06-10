<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Frontend structure

Product code lives under `src/`; the `app/` directory follows Next.js App Router conventions and holds routing only.

The app has three layers with a one-way dependency rule: `app` imports from `features` and `shared`; `features` import from `shared`, never from each other; `shared` imports from nothing above it.

```txt
apps/web/
  app/         # routing, layouts, metadata
  src/
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