# Configuration

All tunable values live in TOML. The loader (`src/backend/config/loader.mjs`) merges layers,
validates the result against `src/backend/config/schema.mjs`, freezes it and injects it through
the container. No other module reads configuration files or `PSM__*` variables.

## Layers (lowest → highest precedence)

1. `config/default.toml` — shipped defaults.
2. `config/hosts/<host>.toml` — host-specific values (paths, CLI, protected entries).
3. `config/platforms/<platform>.toml` — optional OS-specific values.
4. User file `<user config dir>/plugin-skill-manager/config.toml`
   - Windows `%APPDATA%`, macOS `~/Library/Application Support`, Linux `$XDG_CONFIG_HOME` or `~/.config`.
5. Legacy variables: `CODEX_SKILL_MANAGER_CLI`, `CODEX_SKILL_MANAGER_DATA_DIR`,
   `CODEX_SKILL_MANAGER_AUTO_CAPTURE`, `CODEX_SKILL_MANAGER_CAPTURE_INTERVAL_SECONDS`.
6. `PSM__<SECTION>__<KEY>=value`, parsed as a TOML value, e.g.
   `PSM__CAPTURE__INTERVAL_SECONDS=30`, `PSM__REDUNDANCY__ALLOWED_DAYS="[30, 90]"`.

TOML keys are snake_case; code sees camelCase. Unknown keys and out-of-range values stop startup
with the key path and layer in the message.

## Files

| File | Contents |
| --- | --- |
| `config/default.toml` | app, paths, features, host CLI timeouts, capture interval bounds, storage limits, dashboard cache, component scan limits, redundancy limits and overlap thresholds |
| `config/hosts/codex.toml` | Codex home variable/default, data and archive subdirectories, CLI command, protected official plugins |
| `config/hosts/claude.toml` | Placeholder for a future, verified Claude adapter |
| `config/redundancy/task-vocabulary.toml` | Bilingual task patterns used as overlap retrieval clues; extend with your own `[[task]]` entries |

## Examples

```toml
# ~/.config/plugin-skill-manager/config.toml
[capture]
interval_seconds = 30

[redundancy.overlap]
min_jaccard = 0.4

[features]
archive = false        # hide archive tools even on Windows
```

## Rules for contributors

- Add a value to `default.toml` (or the host file) **and** to `schema.mjs`.
- Pass it from the container into the module; modules take explicit options.
- Library fallbacks (`OVERLAP_DEFAULTS`, `REDUNDANCY_DEFAULTS`, `COMPONENT_DEFAULTS`) must equal
  the TOML defaults; `test/config.test.mjs` enforces this.
- The plugin bundle inlines `config/**/*.toml` (`scripts/build-plugin.mjs`).
