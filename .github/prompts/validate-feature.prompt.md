---
name: validate-feature
description: Validate the current feature without modifying code
agent: agent
---

Validate the current Sanaka feature.

Do not modify any files.

Run, in this order:

1. `npx ng test --watch=false`
2. `npx ng build`
3. `git diff --check`
4. `git status --short`
5. `git --no-pager diff --stat`

Report clearly:

- number of test files
- number of tests passed
- number of failures
- build result
- build warnings
- whitespace-check result
- changed files
- diff summary

Distinguish pre-existing warnings from failures caused by the current feature when that can be determined.

If a command fails, report the exact failure.
Do not attempt fixes.
Do not commit or push.
