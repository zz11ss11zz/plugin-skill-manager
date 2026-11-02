# Redundancy assessment principles

## Keep identity fields separate

- **Document author** identifies the declared author or maintainer, such as K-Dense Inc. It is not a plugin, Skill, installation parent or verified download source.
- **Source collection/repository** identifies upstream provenance when verified, such as Scientific Agent Skills. A collection can distribute many separately installable Skills; shared repository or author does not establish one installed parent.
- **Installation parent** identifies the actual installed plugin package or root Skill that owns a component, such as academic-research-suite. Use verified plugin/source/version identity or the root Skill path/ID. Do not invent a parent from its author's name, common prefixes or repository membership.
- **Skill/workflow entry** identifies the individual capability being inspected. Report internal entries with their installation parent, without presenting them as additional independent installations.

## Compare independent installation units

1. Components inside the same installed plugin package or parent Skill are internal organization and division of work by default. Do not list parent/child or sibling relationships as mutual redundancy candidates. Expand those capabilities when comparing against external installed units; preserve the parent relationship and dependencies.
2. Separately installed Skills/plugins remain eligible for functional comparison even when they share an author or repository. Neither shared authorship nor shared repository is an exemption.
3. Judge task, inputs, outputs, scope and dependencies. A common topic or broad capability keyword is only a retrieval clue; it does not establish equivalent capability, runtime conflict or a reason to remove anything.
4. Explicit task routing and documented role separation are evidence of complementary capabilities. Scientific-visualization covers figure design, multi-panel layout, scientific presentation and quality checks; matplotlib focuses on Python plotting implementation and fine control. These overlap in subject but complement each other. Do not flag them solely because both relate to scientific figures.
5. Keep exact duplicate documents/directories, functional substitutability, runtime conflicts and inactivity distinct. Do not claim a conflict without execution/compatibility evidence. Never delete internal dependencies based on broad overlap or zero per-component usage records.
6. Inactivity review uses more than one calendar month without a usage record; unknown/short history and unavailable ledgers stay separate. First observation is not installation time; incomplete coverage cannot prove non-use.

## Require meaningful functional substitutability

- Compare whether the entries can replace each other for the same concrete task, with compatible inputs, scope and dependencies, and whether their primary outputs are substantially the same. Shared subject matter or a shared auxiliary step alone must not automatically create a functional redundancy candidate.
- Treat complementary workflow stages as division of work. Citation/DOI verification shared by manuscript writing and literature ingestion does not make their main capabilities interchangeable: academic-paper produces and revises manuscripts and checks manuscript citations; ingest-literature verifies and registers references/PDFs in project libraries; organize-academic-pdfs classifies and consistently names local files. Do not list these entries as functionally redundant solely on those shared steps.
- A functional candidate must explain the concrete substitutable task and comparable primary outputs. If that evidence is absent or the documented roles are complementary, exclude the pair from functional redundancy candidates rather than leaving it listed with only a recommendation to retain both. Keep independently evidenced exact duplicates, runtime conflicts and inactivity assessments separate.

## Explain the decision

Show the actual installation parent separately from document author and upstream collection. State evidence, meaningful differences and a recommendation. Preserve uncertainty when provenance or dependencies are unverified. Findings do not authorize deletion, disabling, external upload or changes to sharing.
