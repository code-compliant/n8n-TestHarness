# GitHub repository setup

Use this once on a machine with Git installed.

## One-time link to existing GitHub repo

```bash
git init
git add .
git commit -m "chore: initial commit"
git remote add origin https://github.com/code-compliant/n8n-TestHarness.git
git branch -M main
git push -u origin main
```

## If the repo already exists

```bash
git remote add origin https://github.com/code-compliant/n8n-TestHarness.git
git fetch origin
git checkout -b main origin/main
git push -u origin main
```

## Pulling for subsequent work

```bash
git pull --rebase origin main
```

## Optional: authenticate once with GitHub CLI

```bash
gh auth login
```

