---
name: apply-spec
description: Apply a provided implementation specification safely
argument-hint: 'paste or reference the implementation specification'
agent: agent
---

Apply the implementation specification provided in the current conversation.

Follow these rules:

1. Identify the files explicitly allowed by the specification.
2. Read those files before modifying them.
3. Modify only the allowed files.
4. Preserve unrelated code and formatting.
5. Apply complete file contents exactly when complete replacement files are provided, unless they conflict with the current repository.
6. Do not invent extra architecture, dependencies, refactors or visual changes.
7. If the specification conflicts with the current codebase, stop and explain the conflict before editing.
8. After editing, run `git status --short`.
9. Report:
   - files changed
   - what was implemented
   - any conflicts or warnings

Do not commit.
Do not push.
Do not create a pull request.
