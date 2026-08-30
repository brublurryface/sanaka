---
name: start-issue
description: Prepare a clean branch for a GitHub issue
argument-hint: 'issue number and branch name'
agent: agent
---

Prepare the repository for a new Sanaka issue.

Issue:
${input:issueNumber:GitHub issue number}

Branch:
${input:branchName:feature branch name}

Follow this workflow:

1. Run `git branch --show-current`.
2. Run `git status --short`.
3. If the working tree is not clean, stop and report the existing changes. Do not stash or discard them automatically.
4. Switch to `main` if necessary.
5. Run `git pull --ff-only origin main`.
6. Create and switch to the requested branch.
7. Run:
   - `git branch --show-current`
   - `git status --short`
8. Report the final state.

Do not modify source files.
Do not commit.
Do not push.
