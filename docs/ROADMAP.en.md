# Development roadmap after v0.5.0

In v0.5.0, the backend computes activity statistics and serves them to the dashboard through versioned contracts. The proposed priorities are to verify upgrades for existing users, check the dashboard against known records, and then extend desktop validation. Release numbers and dates are open.

| Priority | Work | Acceptance criteria |
| --- | --- | --- |
| 1 · Upgrade and data retention | Upgrade an older installation with call records, Skill notes and archived items to v0.5.0. | Use an isolated data directory. Compare records, notes and archive state before and after the upgrade. Restart and check plugin registration and both the Activity and Manage views. Record the starting version, operating system and result. |
| 2 · Activity counts and interaction | Check date filters, daily rankings and low-use observations while the dashboard loads data asynchronously. | Compare the backend results and displayed counts against the same known records. Cover rapid date changes, dates outside recorded coverage, recovery from a read failure, and switching between English and Chinese. |
| 3 · Desktop platform coverage | Extend the Windows, macOS and Linux automated checks with tests in actual desktop hosts. | For each platform, record complete-package installation, panel opening, restart and uninstall results. Mark untested platforms as pending. |

The next release will be scoped to verified improvements and reproducible fixes. Record completed checks in the [validation log](VALIDATION.md).
