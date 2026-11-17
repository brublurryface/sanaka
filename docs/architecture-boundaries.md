# State ownership and import boundaries

Store consumers read signals and call commands. `PostsStore.currentPage`, `PostsStore.viewMode`
and `CharacterOboloStore.state` keep their public names, but expose `asReadonly()` views of private
writable signals. Existing commands still own pagination, filters, URL synchronization, cancellation
and offer idempotency. This is an API and TypeScript contract, not a runtime security sandbox or a
deep freeze of arbitrary objects. Counter fields already have readonly types.

`npm run check` includes three architecture checks, using the existing TypeScript dependency:

| Command                        | Contract                                                                                                              |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `npm run architecture:check`   | Check production dependency boundaries and browser runtime reachability.                                              |
| `npm run test:architecture`    | Exercise allowed and forbidden fixture projects, including the real CLI exit status.                                  |
| `npm run test:state-contracts` | Compile public store reads/commands and expected errors for external writes/private access; emit and execute nothing. |

## Dependency rules

| Source                                         | Forbidden dependency                                                                                |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `src/app/core`, `src/app/shared`, `src/shared` | Page features in `src/app/pages`.                                                                   |
| One `src/app/pages/<feature>`                  | Another page feature, including type-only coupling.                                                 |
| Core, shared or a feature                      | App composition files or page-level composition barrels used to bypass the rules.                   |
| Production source                              | Unit test files. Tests themselves may integrate features.                                           |
| Browser runtime graph                          | Server entrypoints/files, Node builtins, Express, Nodemailer, Angular SSR/platform-server packages. |

Composition files may wire features together. A feature may use its own files, core and shared.
Existing `src/shared/contact.ts` and newsletter contracts remain usable by both server and client.
New genuinely shared contracts belong in shared code, rather than importing another feature's
implementation or adding an exception for its private types.

The checker reads the production TypeScript config and browser entry from `angular.json`.
It parses imports with the TypeScript AST and resolves local paths, aliases and re-exports using
TypeScript module resolution. Layer rules cover all production files in that config, including
unreachable files. A separate traversal follows browser runtime imports transitively, including
literal lazy imports and CommonJS requires. Thus legitimate SSR-only sources and the server
translation loader remain outside the browser traversal.

Explicit `import type`, `export type`, all-type named bindings and `import(...)` type expressions
are erased contracts and are excluded from runtime reachability. They still obey layer rules.
Unmarked imports are conservatively treated as runtime dependencies, including bindings currently
used only as types. Use explicit type syntax to communicate that distinction. Nonliteral module
paths fail because the dependency cannot be audited statically.

This check covers first-party TypeScript dependencies and known server packages; it does not inspect
third-party package internals, HTML/script URLs, styles, experimental build configurations or every
possible JavaScript metaprogramming technique. It complements TypeScript, the production build and
browser tests. It does not replace them. Adding a server package or a new entrypoint requires reviewing
the rules. No dependency, feature relocation, state-management framework or visual asset is added.

## Verification

Fixtures cover aliases, barrels, lazy imports, import cycles, type/runtime distinctions, shared
contracts, SSR isolation, unreachable violations, missing local targets and imports of test files.
Forbidden fixtures must exit with a diagnostic containing the source file, line and rule. The
compile-only fixture uses `@ts-expect-error`: re-exposing a writer or making a backing field public
makes the check fail. Unit regressions verify that public signals lack writers while commands still
update state, routes, requests and the simulated offer counter. Existing pagination, retry,
navigation and browser regressions remain in the required pipeline.
