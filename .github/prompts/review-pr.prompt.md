---
name: review-pr
description: Perform a final quality review of a pull request
argument-hint: 'pull request number'
agent: agent
---

Review this Sanaka pull request:

${input:prNumber:pull request number}

Do not modify files.
Do not merge the pull request.

Use GitHub CLI to inspect:

- title and body
- base and head branches
- state and mergeability
- changed files
- additions and deletions
- commits
- status checks
- complete diff

Review the diff for:

- unexpected files
- accidental debug code
- obsolete Angular patterns
- unnecessary complexity
- incorrect RxJS usage
- test problems
- accessibility regressions
- maintainability problems
- unrelated changes

For maintainability, inspect the implementation and its callers, including code outside the diff:

- Search for equivalent behavior and CSS under different names. Name the implementations and consumers examined.
- Check the owner of state, requests and business rules across desktop and mobile. Exercise each affected presentation and selection, loading, error and retry state.
- Check whether the component coordinates a view or also owns independent transformations, integrations, persistence or document metadata. Explain each recommended boundary with the caller behavior it must preserve.
- Check that shared components, directives, pipes, services and styles are consumed at the narrowest appropriate scope and that superseded copies were removed.
- Review Portuguese comments and TSDoc against `docs/code-quality-audit.md`, and educational files against `docs/matrix/padroes-didaticos.md`.
- Inspect both duplication checks. They detect repeated tokens in TypeScript, HTML and SCSS. Renamed or structurally different implementations also require manual comparison.
- Report concrete evidence and pending validation. Passing checks establish only the contracts those checks exercise.

Do not request cosmetic redesign unless visual design is part of the pull request scope.

Finish with exactly one conclusion:

READY TO MERGE

or

CHANGES RECOMMENDED

If changes are recommended, explain precisely what should change and why.
