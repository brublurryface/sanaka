# Sanaka Copilot Instructions

## Project

- Sanaka is a modern Angular application using standalone components.
- Prefer current Angular patterns when they are appropriate to the task.
- The project uses TypeScript, RxJS, Angular Material, SSR/SSG and Vitest.
- Do not introduce Karma-specific commands or configuration.
- Components in this repository do not use the `.component` suffix.
- Keep source-code identifiers in English.
- Keep user-facing copy in Portuguese until internationalization is implemented in that area.
- If an internationalization system already exists in the touched feature, use translation resources instead of introducing new hardcoded UI strings.
- Preserve the existing Sanaka design tokens and visual identity.
- Do not perform visual redesign unless visual changes are explicitly part of the task.
- Do not assume that the Express server currently used by Angular SSR is the application's future BFF unless the task explicitly says so.

## Angular

- Prefer built-in Angular control flow such as `@if` and `@for` over legacy structural directives in new code.
- Prefer Signal APIs when they fit the problem.
- Use RxJS when a reactive stream is genuinely useful; do not introduce operators merely to demonstrate RxJS.
- Prefer declarative Observable flows over manual subscriptions when possible.
- When a manual subscription is necessary, use an Angular-safe teardown strategy such as `takeUntilDestroyed`.
- Keep external API DTOs separate from Sanaka domain models when their shapes differ.
- Prefer small, maintainable abstractions over premature architecture.
- Store signals exposed to consumers must be readonly; mutations go through the store's commands.

## Reuse and component responsibilities

- Before adding a component, class, directive, pipe or CSS rule, search for the same behavior across the application, including different names. Read the candidate implementation and its consumers before choosing where the change belongs.
- Keep one owner for each shared state, request and business rule. Desktop and mobile presentations must consume that owner. Prefer responsive CSS for layout changes. When separate markup is necessary, share the behavior and validate both presentations.
- Components coordinate their view and emit user intentions. Review data mapping, validation, persistence, request orchestration and document metadata as separate responsibilities. Extract a responsibility when its consumers or independent changes justify the boundary.
- Trace a representative interaction between components. Identify the owner of feature state and side effects, the data passed to the view, events raised back to the owner, and state local to the view such as focus. A child can coordinate its own independent feature.
- Place reusable code at the narrowest scope that contains its actual consumers. Reuse within one feature belongs in that feature. Cross-feature reuse follows the import boundaries below.
- Every extraction must identify its consumers and remove the superseded implementation. Preserve existing caller contracts and responsive adaptations when moving code.
- Evaluate a shared template or content projection for repeated markup, a directive for repeated DOM behavior, a pipe or function for repeated transformations and a service/store for shared state or integration. Choose the mechanism from the responsibility being shared.
- When size is relevant, count component TypeScript, external template and styles separately, with inline content counted once. Use size to guide inspection and justify extraction by independent reasons to change or a shared contract with identified consumers.

## Comments and project documentation

- Follow the Portuguese comments and TSDoc convention in `docs/code-quality-audit.md`. Use `docs/matrix/padroes-didaticos.md` for the additional educational explanations in Matrix study files.
- Document responsibilities, contracts and decisions that require context, including ownership, cancellation, retry, SSR and side effects. Update those explanations in the change that changes the behavior.
- Keep code identifiers in English. Keep comments in Portuguese and explain the reason or contract without narrating obvious assignments.

## Import boundaries

- `core` and `shared` must not import page features. A page feature must not import another page feature.
- Application composition may wire features together; features, `core` and `shared` must not import that composition to bypass the boundaries.
- Browser runtime dependencies must not reach server files, Node builtins, Express, Nodemailer or Angular server packages. Keep shared client/server contracts in `src/shared`.
- Use explicit `import type` / `export type` for erased contracts. Type-only edges still follow feature boundaries, but are not runtime imports.
- Use literal module paths so lazy imports remain auditable. Unit tests may integrate features; production code must not import tests.
- `npm run check` runs import-boundary fixtures and compile-only store contracts. See `docs/architecture-boundaries.md` for scope and limitations.

## Testing

- Use Vitest-compatible APIs and commands.
- Prefer behavior-focused tests.
- Follow the [testing strategy and acceptance criteria](../docs/testing-quality.md). Preserve the coverage baseline and explain any intentional change to the measurement scope.
- Do not test cosmetic CSS details unless the behavior itself depends on them.
- For changed interactions, verify the applicable accessibility contracts at their real entry points, including accessible name and state, keyboard and focus, announcements and responsive behavior. Identify which checks ran in a browser and which still require assistive technology or a physical device.
- When fake timers are used, restore real timers after the test.
- A failing test does not automatically mean production code is wrong.
- Before changing production behavior to satisfy a test, determine what the intended product behavior actually is.

## Workflow

- Keep branch names in English, following the purpose prefixes and contribution policy in [CONTRIBUTING.md](../CONTRIBUTING.md).
- Use a short, descriptive scope after the prefix; do not add tool or assistant names such as `codex/`.
- Keep one active pull request for the same delivery. Link and close a superseded proposal only after its replacement is ready; preserve review history.
- Read relevant files before editing them.
- Run the local preflight defined in CONTRIBUTING.md before publishing when a compatible environment is available. API commits bypass local hooks; explicitly record checks that could not run.
- When formatting fails in CI, inspect the exact formatting patch before publishing another correction. Never weaken the formatting gate.
- Keep changes strictly inside the requested scope.
- Preserve unrelated code.
- If the user provides complete file contents or an explicit implementation specification, treat that specification as the source of truth unless it conflicts with the current repository.
- If the specification conflicts with the current codebase, stop and report the conflict instead of guessing.
- Do not make speculative improvements outside the task.
- Act as a critical reviewer, not a defender of the current implementation. Investigate warnings and errors with equal priority, even when functionality is unaffected. Never silence or dismiss warnings to obtain a passing check. Record findings and externally controlled blockers explicitly.
- Standing authorization from the author (2026-10-17): commit and push the reviewed changes of a completed, validated delivery and open a pull request against `main` for her review. Do not ask for permission again for these steps.
- Do not merge pull requests or delete branches unless explicitly requested. The author performs the merge.
- Do not use destructive Git commands unless explicitly requested.
- After making changes, report exactly which files changed and the validation results.
- For each PR, identify existing implementations inspected, affected consumers, the owner of shared behavior, responsibilities added or moved, and validation of the affected desktop/mobile states. Use the PR template and record pending checks explicitly.

## Communication

- Be concise and factual.
- Distinguish clearly between:
  - changes made
  - tests run
  - warnings
  - failures
  - recommendations
- Never claim a command succeeded unless it actually completed successfully.
