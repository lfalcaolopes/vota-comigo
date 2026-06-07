## Csv analysis

- Everytime there a csv needs to be analyzed, there is a short doc about all the csv files available at csv/files-docs.md
- CSVs generated because of an analysis must be stored on the csv/analysis directory
 
## Naming and documentation conventions

Code naming and documentation language conventions are defined in `docs/adr/007-convencoes-naming-documentacao.md`. Consult it before creating any identifier or documentation file.

**ADR 007 is the authority on naming, not the docs.** Operational docs, ADR prose, SQL queries (e.g. `docs/matcher/votacao-referencia.md`), and source field aliases are references for *behavior*, not naming. A column alias or a term used in doc prose does **not** justify keeping it as an identifier. Apply the rule from first principles every time:

- English for the syntactic structure: verbs, connectives (`with`, not `com`), boolean predicates, generic helpers, and framework patterns. Generic nouns with a precise English equivalent are English too — `priority`, `pattern`, `classification`, `cascade`, `exclusion`, `summary` (not `prioridade`, `padrao`, `classificacao`, `cascata`, `exclusao`).
- Portuguese (no accents) **only** for domain substantives — and the canonical list is the **bolded glossary in `CONTEXT.md`** (`Votacao`, `Proposicao`, `Deputado`, `referencia`, `Resultado`, `resumo`, `computavel`, `ranking`, `turno`, `plenario`, …). If a word is not a bolded domain term and has a clean English equivalent, it is English.
- The exception is the **Data origin** rule below: identifiers/columns mirroring Câmara source fields are preserved as-is.

When in doubt, a word is generic (English) unless it is a domain term you can point to in `CONTEXT.md`.

### Code comments

Default to no comments. Names and types should carry the meaning. Do not add docstrings that restate a type, signature, or what the code plainly does. Write a comment only to explain a non-obvious *why* (a surprising decision, a constraint, a workaround) — and keep it to one short line. AAA section markers in tests are the exception and stay.

## Shared types and contracts

`@vota-comigo/shared-types` is the single source of truth for any type that crosses a boundary — the public API contract (DTOs, response shapes) and any literal set / enum that both the front and back, or two backend modules, need to agree on (e.g. the votação-referência pattern list, the votação result values).

- Define such a literal set or enum **once** in `shared-types` (a `z.enum([...])` plus its `z.infer` type) and import it everywhere else. Do **not** redeclare a parallel `type X = 'a' | 'b' | ...` union in a module that already has, or could share, a contract counterpart — parallel lists drift silently.
- Domain/app modules import these as **type-only** (`import type { ... } from '@vota-comigo/shared-types'`). That keeps pure modules (like the matcher) free of runtime, framework, and DB dependencies while still reusing the canonical type.
- `shared-types` must never import from `apps/*`. The dependency direction is always app → contract, never the reverse.

Before adding a string-literal union or enum, check whether `shared-types` already defines it (or should).

## Data origin

The project's data source is the API and CSVs published at `dadosabertos.camara.leg.br`, both in Portuguese. Identifiers and field names coming from this source are preserved as-is (`siglaOrgao`, `codTipo`, `idDeputado`, `idProposicao`, `idUltimaLegislatura`, etc.) — do not translate, do not rename to "normalize". When you need to reference these fields in domain code, keep the original API spelling.

## Downloaded CSV data is read-only

The downloader writes the Câmara source CSVs to `apps/api/data/raw/{dataset}/...` (gitignored). These files are downloaded by hand, are expensive to rebuild, and are the source of truth for ingestion. Treat the whole `data/raw/` tree as immutable.

- **Never write to or overwrite anything under `data/raw/`.** Do not create test fixtures or scratch files there, and never use `printf >`, the `Write` tool, or a "download a fixture" shortcut against those paths — it silently destroys a real download.
- For tests or manual E2E that need CSV input, build the fixture somewhere disposable (the job tmp dir / `$TMPDIR`) or feed an in-memory `Readable` to the CSV reader. 
 
## Testing

- Tests describe **behavior**, not implementation. Renaming a variable or extracting a method must never break a test.
- Group tests by scenario using nested `describe`, not by method name.
- Use AAA pattern (Arrange/Act/Assert) with section comments.
- Mock only external dependencies. Never mock the unit under test.
- Unit tests must not touch real databases, network, or other modules.

## Agent skills

### Issue tracker

Issues live in GitHub Issues at `lfalcaolopes/vota-comigo` via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Canonical defaults: needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.