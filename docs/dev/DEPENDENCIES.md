# Dependencies

Development uses **pnpm**, pinned by `package.json#packageManager` (`pnpm@12.15.0`; Corepack or
`pnpm/action-setup` installs exactly that version). End users never install dependencies: the
released plugin bundles everything into `server/src/server.mjs` and `dist/dashboard.html`.

## Single source of versions

Every version is written once, in the `catalog:` of `pnpm-workspace.yaml`. `package.json` refers to
it with `"catalog:"`. Versions are exact; `pnpm-lock.yaml` is committed and CI installs with
`pnpm install --frozen-lockfile`.

CI runs in two places: GitLab (`.gitlab-ci.yml`, the `origin` remote) and GitHub Actions
(`.github/workflows/test.yml`). The GitLab pipeline:

| Stage | Jobs | Notes |
| --- | --- | --- |
| test | `test:node`, `deps:audit`, `deps:lockfile`, `deps:licenses`, GitLab SAST, secret detection | `test:node` builds the dashboard and runs every `test/**/*.test.mjs` (Node 24.22.1) with a JUnit report for the Tests tab. High/critical advisories, `pnpm dedupe --check`, production licenses against the allowlist in `scripts/check-licenses.mjs`. |
| package | `package:plugin-codex` | Manual, on every branch, tag and merge request pipeline. Available after `test:node` and the dependency checks pass; the bundle is kept as an artifact for one week. |

Contract, architecture and type checks are not part of the GitLab pipeline; `pnpm run verify` runs them locally.
GitHub Actions still runs `pnpm run verify` on Windows, macOS and Linux.

## Supply-chain blocks (`pnpm-workspace.yaml`)

| Setting | Effect |
| --- | --- |
| `minimumReleaseAge: 10080` | Versions younger than 7 days cannot be installed. |
| `trustPolicy: no-downgrade` | A release whose provenance/trust level is lower than earlier releases is refused. |
| `allowBuilds` + `strictDepBuilds` | Only `esbuild` may run install scripts; any other build script fails the install. |
| `engineStrict` | Node engine ranges are enforced. |

These are not theoretical: while adding type definitions, `trustPolicy` refused
`undici-types@6.21.0` (pulled in by `@types/node` 22). The fix was choosing `@types/node` 24,
whose dependency passes, not an exclusion.

## Where packages may be imported

`scripts/check-architecture.mjs` enforces it: `yaml`, `acorn`, `smol-toml` only in
`src/backend/vendor/`; `zod` in contracts and config; `@modelcontextprotocol/sdk` in the MCP
inbound layer; `@modelcontextprotocol/ext-apps` in the frontend. Replacing a library therefore
touches one wrapper.

## Upgrading

1. Edit the version in the `catalog:` (choose a release older than the age limit).
2. `pnpm install` — refused versions surface as install errors; do not add exclusions without a
   recorded reason.
3. `pnpm run verify` (contracts, architecture, type check, build, tests).
4. `pnpm run build:plugin` and confirm `THIRD_PARTY_NOTICES.md` lists the new license.
5. Commit `pnpm-workspace.yaml` and `pnpm-lock.yaml` together.
