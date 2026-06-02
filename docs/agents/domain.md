# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- **`CONTEXT.md`** at the repo root, or
- **`CONTEXT-MAP.md`** at the repo root if it exists — it points at one `CONTEXT.md` per context. Read each one relevant to the topic.
- **`docs/adr/`** — read ADRs that touch the area you're about to work in. In multi-context repos, also check `src/<context>/docs/adr/` for context-scoped decisions.

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The producer skill (`/grill-with-docs`) creates them lazily when terms or decisions actually get resolved.

## File structure

Single-context repo (most repos):

```
/
├── CONTEXT.md
├── docs/adr/
│   ├── 0001-event-sourced-orders.md
│   └── 0002-postgres-for-write-model.md
└── src/
```

Multi-context repo (presence of `CONTEXT-MAP.md` at the root):

```
/
├── CONTEXT-MAP.md
├── docs/adr/                          ← system-wide decisions
└── src/
    ├── ordering/
    │   ├── CONTEXT.md
    │   └── docs/adr/                  ← context-specific decisions
    └── billing/
        ├── CONTEXT.md
        └── docs/adr/
```

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal — either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/grill-with-docs`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0007 (event-sourced orders) — but worth reopening because…_

## Writing an ADR

When you add or edit a file in `docs/adr/`, match the house style — the existing ADRs are uniform, and a templated or list-heavy ADR stands out as wrong:

- **One `#` title, nothing else.** A noun phrase naming the decision (e.g. "Estratégia de persistência: storage de inputs, não de scores"). No `## Status` / `## Context` / `## Decision` / `## Consequences` sections, no metadata block, no date.
- **Prose, not lists.** Argue the decision in flowing paragraphs, typically two to six. Avoid bullet lists, numbered lists and tables; at most one short bullet list with bold lead-ins, and only to enumerate genuinely parallel cases or rejected alternatives.
- **Implicit arc:** open by stating the decision concretely, in present tense ("O banco armazena…", "O cálculo considera apenas…"); then the justification, with empirical numbers woven inline; then alternatives named and explicitly rejected ("A alternativa de X foi rejeitada porque…"); then the accepted cost or trade-off, tied to a project principle, pointing to `docs/melhorias.md` for deferred evolution.
- **Portuguese with accents** (ADR 0007); source field names in backticks; never accents in identifiers.
- **Cite other ADRs as `ADR 0NNN`** — space, zero-padded to four digits (e.g. `ADR 0009`), not `ADR-9` or `ADR-009`.
