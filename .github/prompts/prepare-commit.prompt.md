---
name: prepare-commit
description: Stage and review the current feature before committing
argument-hint: 'paths that belong to the feature'
agent: agent
---

Prepare the current Sanaka feature for commit review.

Paths to stage:
${input:paths:paths that belong to the feature}

Do not modify source files.

Workflow:

1. Run `git status --short`.
2. Stage only the requested paths.
3. Run `git status --short`.
4. Review exactly what is staged:
   - `git --no-pager diff --cached --stat`
   - `git --no-pager diff --cached`
5. Run `git diff --cached --check`.
6. Check for unexpected staged files.
7. Report:
   - staged files
   - unstaged files
   - untracked files
   - diff summary
   - whitespace-check result
   - any unexpected changes

STOP after the review.

Do not commit.
Do not push.
Do not create a pull request.
