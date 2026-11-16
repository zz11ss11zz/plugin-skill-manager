# Followed collections: counts and usage evidence

Show the number of publicly distributed Skills separately from the number of discovered entry paths. Pin the repository revision and inspect the public collection and plugin manifests. Keep archived and maintainer entries expandable but outside the public count; list uncertain roles separately. Include public Skills distributed only by a plugin.

Group verified copies of one Skill into a row with expandable paths and owning plugins. A matching entry document is evidence about that document only. Preserve differences in scripts, dependencies and installation provenance. Keep unresolved matches and same-name entries from different sources distinct. Display grouping never changes local installation IDs, archive targets or ledger keys.

For a matched installation, show recorded adoptions in the selected period and the latest recorded time. Flag incomplete coverage even alongside positive counts. If the readable ledger has no entry for that installation, show “Not recorded in this ledger” with no last-use date. If it has history outside the period, show “No adoption records in this period”. For unreadable data, unknown coverage or ambiguous attribution, show the reason and leave the count unknown. For an unmatched installation, show “No local match” and usage as inapplicable. Missing evidence cannot establish non-use or justify cleanup.

Keep plugin calls, file reads and Skill adoptions separate. Count each original adoption occurrence once per collection, regardless of how many distribution paths expose it. Preserve multiple genuine occurrences within a batch.

## Acceptance cases

The [pinned baoyu-design snapshot](https://github.com/zz11ss11zz/baoyu-design/tree/9c5253c002820d8dd4c9c31e9c8ca04b529a3e34) contains 22 SKILL.md paths and seven public entries under skills/. Show seven rows in the top-level collection view. Expand dataviz to see its top-level entry and copies in baoyu-dataviz and baoyu-motion, all with the same entry blob. Show archive and maintenance paths separately. Verify a plugin-only public Skill is included when a collection contains one.

With local matches for claude-design, claude-dashboard and dataviz but no corresponding ledger entries, all three rows should say “Not recorded in this ledger”. Add one adoption attributable to the installed dataviz instance: both its row and the collection gain one. Make the ledger unavailable: show unknown. Introduce another instance with the same name but different provenance: a name-only event must not be credited to both.
