## Csv analysis

- Everytime there a csv needs to be analyzed, there is a short doc about all the csv files available at csv/files-docs.md
- CSVs generated because of an analysis must be stored on the csv/analysis directory
 
## Naming and documentation conventions

Code naming and documentation language conventions are defined in `docs/adr/007-convencoes-naming-documentacao.md`. Consult it before creating any identifier or documentation file.

## Data origin

The project's data source is the API and CSVs published at `dadosabertos.camara.leg.br`, both in Portuguese. Identifiers and field names coming from this source are preserved as-is (`siglaOrgao`, `codTipo`, `idDeputado`, `idProposicao`, `idUltimaLegislatura`, etc.) — do not translate, do not rename to "normalize". When you need to reference these fields in domain code, keep the original API spelling.

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