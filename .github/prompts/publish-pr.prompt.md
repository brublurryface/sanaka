---
name: publish-pr
description: Commit an approved staged change and create a pull request
argument-hint: 'commit message, PR title and optional issue number'
agent: agent
---

Publish the currently reviewed and staged Sanaka change.

Commit message:
${input:commitMessage:commit message}

Pull request title:
${input:prTitle:pull request title}

Related issue, if applicable:
${input:issueNumber:optional GitHub issue number}

Do not modify source files.
Do not stage unrelated files.

Workflow:

1. Run `git status --short`.
2. Run `git --no-pager diff --cached --stat`.
3. Run `git diff --cached --check`.
4. If nothing is staged, stop.
5. If the staged diff contains unexpected files or the whitespace check fails, stop.
6. If there are unstaged changes inside paths already included in the staged change, stop and report them before committing.
7. Commit exactly the reviewed changes using the requested commit message.
8. Push the current branch and configure its upstream if necessary.
9. Create a pull request against `main` using GitHub CLI.
10. Generate a concise pull request body containing:
    - Summary
    - Validation
    - `Closes #<issue number>` only when a related issue was provided
11. Report:
    - commit hash
    - branch
    - push result
    - PR number
    - PR URL

Do not merge the pull request.
