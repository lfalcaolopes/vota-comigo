---
description: Define test scenarios for a new feature before implementation
---

Define unit test scenarios for the spec below. **No production code in this phase.**

## Process

1. Read the spec and AGENTS.md
2. For each unit, propose test scenarios using the categories below (skip categories that don't apply)
3. List the public interface you are assuming (method names, inputs, outputs, error types). I need to review this before you write any tests.
4. Ask me about any ambiguous or assumed business rules. Do not proceed with assumptions — wait for my confirmation.
5. Once I confirm both the interface and the scenarios, save to `docs/specs/[feature-name]-test-scenarios.md`
6. Implement the test files, run them, confirm they fail because the implementation doesn't exist (not because of syntax errors or bad imports)

## Categories (skip what doesn't apply)

1. **Happy path** — normal valid inputs
2. **Input boundaries** — empty, null, zero, negative, max/min, single vs many
3. **Invalid inputs** — what should be rejected and how
4. **State-dependent behavior** — different prior states, different outcomes
5. **Side effects** — events, callbacks, state mutations
6. **Failure modes** — external dependency failures (DB errors, not found, timeouts). Only when dependencies exist.
7. **Conditional branches** — every meaningful branch exercised
8. **Idempotency / duplicate operations** — what happens when the same action is performed twice

## Output format

Group scenarios by unit, then by category. Each scenario as `- should [behavior] when [condition]`. Include:
- **Assumed public interface**: list every method with its signature (name, params, return type, errors thrown)
- **Open questions**: anything ambiguous that needs my input before proceeding
- No "Assumptions made" section — ask me instead of assuming

## Spec

$ARGUMENTS
