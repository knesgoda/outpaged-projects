# Secret Management Checklist

The OutPaged migration work starts by ensuring no sensitive configuration makes it into source control. Use the checklist below before opening a pull request from the long-lived migration branch.

## Environment files

- `.env` files are ignored from version control. A safe `.env.example` is provided for onboarding so new contributors can copy it locally without exposing secrets.
- Never commit real Supabase URLs, anon keys, service roles, or third-party credentials. Store production secrets in your secret manager of choice (e.g., 1Password, Doppler, Vault).

## Scanning for leaked secrets

- Run `detect-secrets scan --all-files --exclude-files 'node_modules|.git|dist'` locally to baseline the repository and catch obvious patterns.
- Run `gitleaks detect --no-banner --redact` before every push. If the CLI is unavailable, install it via `brew install gitleaks` (macOS) or `go install github.com/gitleaks/gitleaks/v8@latest` and re-run.
- When a commit contains an exposed secret:
  1. Rotate the credential immediately in the upstream provider.
  2. Rewrite the Git history with [`git filter-repo`](https://github.com/newren/git-filter-repo) or an approved internal scrub tool to remove the value.
  3. Force-push the cleaned branch (`git push --force-with-lease`).
  4. Document the incident in the security runbook and notify the platform team.

## Supabase key hygiene

- Rotate any Supabase keys that were previously committed and update the secure storage location before enabling new authentication flows.
- Confirm that preview/staging environments use different anon keys from production. Never share service-role keys outside locked-down server environments.

## Developer safeguards

- Use repository pre-push hooks (`npm run prepush`) to run type checks, linting, tests, and secret scans before publishing changes.
- Consider enabling local tools such as [git-secrets](https://github.com/awslabs/git-secrets) or [talisman](https://github.com/thoughtworks/talisman) for an additional safety net when working on high-risk branches.
