## Naming and documentation conventions

Naming follows `docs/adr/007-convencoes-naming-documentacao.md` — consult it before creating any identifier or documentation file. ADR 007 is the authority; nothing you see elsewhere overrides it. Operational docs, ADR prose, SQL queries (e.g. `docs/matcher/votacao-referencia.md`), and source field aliases are references for *behavior*, not naming — a column alias or a term in prose never justifies an identifier. Re-derive from the rule each time instead of copying existing usage as precedent. When in doubt, a word is generic (English) unless it's a domain term you can point to in `CONTEXT.md`.

Source fields from `dadosabertos.camara.leg.br` (API and CSVs, both Portuguese) are a separate case: when *referencing* a field, preserve its original spelling as-is (`siglaOrgao`, `codTipo`, `idDeputado`, `idProposicao`, `idUltimaLegislatura`) — never translate or "normalize". Naming an identifier of your own still follows ADR 007.

## Code comments

Default to no comments — one exists only to explain a non-obvious *why* (a surprising decision, a constraint, a workaround), in one line; no docstrings that restate a type or signature. AAA section markers in tests are the exception and stay.

## Shared types and contracts

`@vota-comigo/shared-types` is the single source of truth for any type that crosses a boundary: the public API contract (DTOs, response shapes) and any literal set / enum that front and back, or two backend modules, must agree on (the votação-referência patterns, the votação result values).

- Define each one **once** as `z.enum([...])` + its `z.infer` type and import it everywhere — never redeclare a parallel `'a' | 'b'` union of a set that crosses (or could cross) a boundary; parallel lists drift. Check `shared-types` first before adding any union or enum.
- Domain/app modules import these **type-only** (`import type { ... }`), keeping pure modules (the matcher) free of runtime, framework, and DB dependencies.
- `shared-types` never imports from `apps/*` — direction is always app → contract.

## Downloaded CSV data is read-only

The downloader writes the Câmara source CSVs to `apps/api/data/raw/{dataset}/...` (gitignored). These are downloaded by hand, expensive to rebuild, and the source of truth for ingestion. Treat the whole `data/raw/` tree as immutable.

- **Never write to or overwrite anything under `data/raw/`.** No test fixtures or scratch files there, and never point `printf >`, the Write tool, or a "download a fixture" shortcut at those paths — it silently destroys a real download.
- For tests or manual E2E that need CSV input, build the fixture somewhere disposable (the job tmp dir / `$TMPDIR`) or feed an in-memory `Readable` to the CSV reader.

## Testing

- Tests describe **behavior**, not implementation.
- Group by scenario with nested `describe`, not by method name.
- AAA pattern with section comments.
- Mock only external dependencies; never mock the unit under test.
- Unit tests never touch real databases, network, or other modules.

## Browser automation

Playwright is configured in `apps/web` for agent-driven browser interaction with the web app. Agent browser runs use port `3000`.

- Default E2E command: `pnpm --filter web test:e2e`. It starts Next on `127.0.0.1:3000` through `apps/web/playwright.config.ts` when no explicit base URL is provided.
- If a Next dev server is already running on port `3000`, do not start another one. Reuse it with `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 pnpm --filter web test:e2e`.
- For headed inspection, use `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 pnpm --filter web test:e2e:headed`.
- Next 16 prevents two `next dev` processes for the same app directory; use port `3000` whether reusing an existing server or starting a new one.
- Do not run browser automation inside the Codex sandbox. Run Playwright and browser-driven checks with sandbox escalation because local port bind/connect and Chromium launch can fail with `EPERM`.

## Commit messages

Conventional Commits: `<type>: <description>`, type one of `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `ci`.

## Agent skills

Skill details live under `docs/agents/`: issue tracker (`issue-tracker.md` — GitHub Issues at `lfalcaolopes/vota-comigo` via `gh`) and domain docs (`domain.md` — `CONTEXT.md` + `docs/adr/`). Canonical triage labels: needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix (`triage-labels.md`).
