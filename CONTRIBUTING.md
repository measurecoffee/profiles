# Contributing to measurecoffee/profiles

`main` is protected. Do not push directly to `main`.
All changes must be made on a branch and merged through a pull request.

## Required Workflow

1. Update local `main`.
   ```bash
   git checkout main
   git pull --ff-only origin main
   ```
2. Create a feature branch from `main`.
   ```bash
   git switch -c feat/short-description
   ```
   Use `hotfix/short-description` for urgent production fixes.
3. Commit changes and push your branch.
   ```bash
   git push -u origin <branch-name>
   ```
4. Open a pull request targeting `main`.

## Pull Request Requirements

Before merge, every PR must have:

- at least 1 approving review
- all review conversations resolved
- passing CI checks from the `PR CI` workflow (`.github/workflows/pr-ci.yml`)
- an up-to-date base with `main`
- a **Live Preview Test Plan** in the PR body that includes:
  - preview URL
  - reproducible numbered steps
  - expected outcomes that a board member/agent can validate without local context

## Live Preview Validation Standard

For any user-visible feature, include board-executable validation instructions:

1. Open the preview URL.
2. Sign in with the test account/role described in the PR.
3. Execute the numbered steps exactly as written in the PR.
4. Confirm expected results and note any mismatch in PR comments before merge.

## Merge Expectations

- Keep `main` linear by using squash or rebase merge.
- Address feedback on the same branch and push updates to the PR.
- Do not bypass branch protection rules.
