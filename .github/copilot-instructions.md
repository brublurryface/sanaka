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

## Testing

- Use Vitest-compatible APIs and commands.
- Prefer behavior-focused tests.
- Do not test cosmetic CSS details unless the behavior itself depends on them.
- Test accessibility contracts when relevant.
- When fake timers are used, restore real timers after the test.
- A failing test does not automatically mean production code is wrong.
- Before changing production behavior to satisfy a test, determine what the intended product behavior actually is.

## Workflow

- Read relevant files before editing them.
- Keep changes strictly inside the requested scope.
- Preserve unrelated code.
- If the user provides complete file contents or an explicit implementation specification, treat that specification as the source of truth unless it conflicts with the current repository.
- If the specification conflicts with the current codebase, stop and report the conflict instead of guessing.
- Do not make speculative improvements outside the task.
- Do not silently fix unrelated warnings.
- Do not commit, push, merge, delete branches or create pull requests unless explicitly requested.
- Do not use destructive Git commands unless explicitly requested.
- After making changes, report exactly which files changed and the validation results.

## Communication

- Be concise and factual.
- Distinguish clearly between:
  - changes made
  - tests run
  - warnings
  - failures
  - recommendations
- Never claim a command succeeded unless it actually completed successfully.
