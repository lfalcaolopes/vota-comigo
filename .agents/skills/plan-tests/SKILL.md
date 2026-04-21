---
name: plan-tests
description: Define unit test scenarios for a new feature before implementation. Use when starting a new module or feature and need to define what tests to write.
allow_implicit_invocation: false
---
Define unit test scenarios for the spec below. **No production code in this phase.**

## Process

1. Read the spec and AGENTS.md
2. For each unit, propose test scenarios using the categories below (skip categories that don't apply)
3. Ask me about any ambiguous or assumed business rules before finalizing
4. Once I confirm, save to `docs/specs/[feature-name]-test-scenarios.md`
5. Implement the test files, run them, confirm they fail because the implementation doesn't exist (not because of syntax errors or bad imports)

## Categories (skip what doesn't apply)

1. **Happy path** — normal valid inputs
2. **Input boundaries** — empty, null, zero, negative, max/min, single vs many
3. **Invalid inputs** — what should be rejected and how
4. **State-dependent behavior** — different prior states, different outcomes
5. **Side effects** — events, callbacks, state mutations
6. **Failure modes** — external dependency failures (only when dependencies exist)
7. **Conditional branches** — every meaningful branch exercised

## Output format

Group scenarios by unit, then by category. Each scenario as `- should [behavior] when [condition]`. Include an "Assumptions made" section listing any inferred rules, and an "Open questions" section for unresolved ambiguities.

## Spec

$ARGUMENTS
