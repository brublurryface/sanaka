---
name: merge-pr
description: Merge an approved PR and synchronize main
argument-hint: 'pull request number and related issue number'
agent: agent
---

Finish an approved Sanaka pull request.

Pull request:
${input:prNumber:pull request number}

Related issue:
${input:issueNumber:GitHub issue number}

Do not modify source files.

Workflow:

1. Inspect the pull request state, mergeability and merge status.

2. If the pull request is OPEN:
   - confirm that it is clean and mergeable
   - if it is not ready, stop and report the reason
   - merge using a normal merge
   - delete the remote feature branch

3. If the pull request is already MERGED:
   - do not treat this as an error
   - skip the merge step
   - continue with repository synchronization and verification

4. If the pull request is CLOSED without being merged:
   - stop and report the state

5. Switch the local repository to `main`.

6. Run:
   - `git pull --ff-only origin main`
   - `git branch --show-current`
   - `git status --short`

7. Verify using GitHub CLI:
   - pull request state
   - merge commit
   - related issue state

8. Report:
   - merge result or already-merged state
   - merge commit hash
   - current branch
   - working tree state
   - pull request state
   - issue state

Do not make unrelated Git changes.
