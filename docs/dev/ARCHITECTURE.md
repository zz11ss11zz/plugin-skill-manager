# Architecture

Plugin & Skill Manager is one local MCP server that also serves an MCP Apps dashboard. The
codebase is split into a **backend** (MVC on the inbound side, hexagonal inside) and a
**frontend** (MVVM). The two halves share **no code**; they meet only at versioned contracts.

```
 frontend (browser, MVVM)          View ⇄ ViewModel ⇄ api client
                                              │ MCP tool calls (MCP Apps bridge)
                         contracts/schema/v1/*.json   ← generated, versioned
                                              │
 backend (Node)   inbound/mcp   Router → Controller → (Presenter text)
                  application   use-case services (orchestration only)
                  domain        pure rules: redundancy, activity, comparison
                  ports         Host · Platform · Repositories (interfaces)
                  adapters      hosts/codex · platform/{win32,darwin,linux} · storage/json-file
                  config        TOML layers → validated, frozen object
```

## Source layout

| Path | Layer | Responsibility |
| --- | --- | --- |
| `src/server.mjs` | entry | Stable process entry (registered by source installs; bundler entry). |
| `src/backend/main.mjs` | entry | CLI flags, data preparation, stdio transport. |
| `src/backend/container.mjs` | composition | The only place that picks concrete adapters. |
| `src/backend/inbound/mcp/` | inbound (MVC) | `routes.mjs` declarative tool table, `router.mjs` registration + middleware, `controllers/` result shaping, `resources/` dashboard resource. |
| `src/backend/application/` | application | Use cases: inventory, plugin status/redundancy, usage, recording, notes, archive, health, activity views. |
| `src/backend/domain/` | domain | Pure business rules. No IO, no Node built-ins. |
| `src/backend/ports/` | ports | JSDoc interfaces adapters must satisfy. |
| `src/backend/adapters/` | adapters | Codex host, operating systems, JSON-file storage, Skill-file walking/archive, diagnostics. |
| `src/backend/contracts/` | contracts | zod definitions of every tool input and output envelope. |
| `src/backend/config/` | config | TOML loader and schema. |
| `src/backend/vendor/` | vendor | The only importers of `yaml`, `acorn`, `smol-toml`. |
| `src/backend/runtime/` | runtime | Install-location paths and the build-injected dashboard. |
| `src/frontend/` | frontend | `main.mjs` bootstrap, `api/` gateway, `viewmodels/`, `views/`, `state/`, `format/`, `i18n/`, `assets/`, `generated/`. |
| `config/` | — | Shipped TOML configuration. |
| `contracts/` | — | Generated JSON Schema contracts (`pnpm run contracts`). |
| `assets/brand/` | — | Icons used by the server and packages. |

## Dependency rules

Enforced by `pnpm run check:architecture` (`scripts/check-architecture.mjs`) in CI.

| Layer | May import |
| --- | --- |
| domain | domain only (no `node:*`) |
| application | application, domain, ports, `node:path`, `node:crypto` |
| ports / contracts | themselves (`zod` for contracts) |
| adapters | adapters, ports, domain, vendor, runtime, `node:*` |
| inbound | inbound, composition, contracts, ports, runtime, `@modelcontextprotocol/sdk` |
| config | config, vendor, runtime, ports, `zod` |
| frontend | frontend, `package.json`, `@modelcontextprotocol/ext-apps` — **never backend** |

## Frontend: MVVM, no business rules

- **View** (`views/*.view.mjs`) renders and forwards events.
- **ViewModel** (`viewmodels/*.vm.mjs`) holds UI-only state (tab, selected date, date range,
  loading/error, last result) and presentation logic: selecting, joining, ordering.
- **Model** is the backend, reached only through `api/client.mjs`, which checks responses against
  `generated/contracts.mjs`.

Rule of thumb: if the model or a CLI could need a result, it is a business rule and belongs in the
backend. Activity rankings, coverage, unknown-vs-zero and low-use observation are computed by
`domain/activity/views.mjs` and served by the app-only tool `query_activity_views`
(`_meta.ui.visibility: ["app"]`). The activity ViewModel loads every tab/source of a year in one
call, so switching is synchronous; only a custom date range or another year triggers a request.

| Panel | ViewModel | View |
| --- | --- | --- |
| Activity | `activity.vm.mjs` — tab, source, year, pinned day, date range; cached backend views | `activity.view.mjs` |
| Manage | `management.vm.mjs` — page, section, kind, filters, drafts, operation plan, automatic check (60 s reuse), one action at a time | `management.view.mjs` |
| Health | `health.vm.mjs` — one manual diagnosis at a time, previous report kept on failure | `health.view.mjs` |

ViewModels hold no translated text: errors keep the server message or a code that the view
localizes. Commands that change what is shown notify subscribers; typing in a search box updates
state silently so the view refreshes only its list and the input keeps focus. `main.mjs` creates
each ViewModel and injects it into its view; views import nothing but i18n and assets.

Recommendations for named Skills are configuration, not view code: `config/redundancy/guidance.toml`
(purposes and pair rules) and the `label` of each task in `task-vocabulary.toml`. The backend
(`domain/redundancy/guidance.mjs`) attaches `guidance` to each redundancy group and `purpose` to each
member; the view only picks the language and adds generic wording.

## Contracts

`src/backend/contracts/tools.mjs` is the single definition. `pnpm run contracts` writes
`contracts/schema/v<N>/` and `src/frontend/generated/contracts.mjs`; `pnpm run contracts:check`
fails CI when they are stale. Bump `CONTRACT_VERSION` for incompatible changes. Input bounds that
are configurable (capture interval, redundancy windows) are generated from the shipped defaults.

## Extending

**Another operating system** — add `adapters/platform/<id>.mjs` (config dir, path comparison,
trusted system links, capabilities), register it in `adapters/platform/index.mjs`, add it to
`test/contracts/platform.contract.test.mjs`, add a CI runner. Enable the `archive` capability only
after real acceptance on that platform. macOS and Linux adapters exist; archive moves stay
Windows-only until verified.

**Another AI host (e.g. Claude)** — add `adapters/hosts/<id>/` implementing the `Host` port
(`ports/host.mjs`): Skill roots and scanning, installed-plugin evidence, optional tool-event
capture, UI metadata, protected entries. Add `config/hosts/<id>.toml` and register the factory in
`adapters/hosts/index.mjs`. Add a packaging target under `packaging/`. Domain, application,
inbound and frontend do not change. `config/hosts/claude.toml` is a placeholder: the Claude
layout, plugin registry and log format must be verified against official documentation and a real
installation first; synthetic tests are not host acceptance.

**Another storage** — implement the repository ports (`ports/repositories.mjs`) and select it in
`container.mjs`.

## Type checking

`pnpm run typecheck` runs TypeScript over JSDoc (`tsconfig.json`, `checkJs`, no emit). Covered
today: domain, ports, contracts, config, application, frontend api/state/viewmodels/format.
Adapters, inbound and views are added as their JSDoc is completed.

## Compatibility kept

- Tool names, inputs and response text are unchanged. New: `generate_redundancy_report`;
  `check_plugin_status` with `includeReport` remains as a deprecated alias. New app-only:
  `query_activity_views`.
- Data directory, file formats and legacy `CODEX_SKILL_MANAGER_*` variables are unchanged.
- Bundle output path `server/src/server.mjs` and source entry `src/server.mjs` are unchanged.

## Follow-up

- Extend `checkJs` to adapters, inbound and views.
- Implement and verify a Claude host adapter.
- Accept archive moves on macOS/Linux, then enable the capability there.
