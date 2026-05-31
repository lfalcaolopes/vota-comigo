## Csv analysis

- Everytime there a csv needs to be analyzed, there is a short doc about all the csv files available at csv/files-docs.md
- CSVs generated because of an analysis must be stored on the csv/analysis directory
 
## Naming and documentation conventions

Code naming and documentation language conventions are defined in `docs/adr/007-convencoes-naming-documentacao.md`. Consult it before creating any identifier or documentation file.

### Code comments

Default to no comments. Names and types should carry the meaning. Do not add docstrings that restate a type, signature, or what the code plainly does. Write a comment only to explain a non-obvious *why* (a surprising decision, a constraint, a workaround) — and keep it to one short line. AAA section markers in tests are the exception and stay.

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