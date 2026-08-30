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

Do not request cosmetic redesign unless visual design is part of the pull request scope.

Finish with exactly one conclusion:

READY TO MERGE

or

CHANGES RECOMMENDED

If changes are recommended, explain precisely what should change and why.
