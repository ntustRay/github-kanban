# GitHub Kanban

Use Bun. Run `bun run check`, `bun test`, and `bun run build` before release.
Use Biome for formatting. Markdown is UTF-8.

## Boundaries

- GitHub-only identity; no password, email, or alternative login providers.
- GitHub App permissions: Contents read, Metadata read, Email addresses read. No write permission.
- Application calls to the GitHub API must remain GET-only.
- Never commit secrets, .env files, private repository names, notes, or token values.
- Every board query must be scoped to the authenticated user ID.
- Agent tokens store SHA-256 hashes only. OAuth tokens use Better Auth encryption.
- Authenticated writes require same-origin browser requests or a scoped bearer token.
- Preserve manual statuses and notes when syncing. Use version checks to avoid lost updates.
- Repository Markdown is untrusted. Never render raw HTML or load remote embedded images.

## Structure

`src/lib/github.ts`: read-only GitHub client. `src/lib/board.ts`: owner-scoped persistence.
`src/app/api`: browser and agent APIs. `src/components`: board, document viewer, token controls.
`migrations`: additive schema. `scripts/migrate.ts`: Better Auth and board migrations.

## API

See `public/llms.txt` and `public/openapi.json`. API tokens only manage the board.
Do not put operational tasks or secrets into this file.
