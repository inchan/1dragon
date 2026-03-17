# 1Dragon

## What This Is

1Dragon is pivoting from a direct shortform video-generation studio to a reference-first ad intelligence workspace. The active product goal is to turn product facts, landing-page truth, market language, platform grammar, and official ad references into explainable storyline recommendations before anyone makes a creative.

The repository still contains the previous shortform runtime and review stack. That code is now treated as downstream infrastructure and historical context, not the primary product promise.

## Core Value

Turn one product brief into trustworthy, reference-backed storyline options without copying specific ads.

## Requirements

### Validated

- ✓ The repo already contains product/image analysis, creative-review artifacts, and shortform planning traces from the previous studio phase.
- ✓ A multi-source reference collection strategy and normalized intake schema already exist as reusable groundwork.

### Active

- [ ] Normalize product input into product facts, target, KPI, and landing-page truth.
- [ ] Collect official reference signals and market-language inputs with explicit rights state.
- [ ] Extract reusable structure patterns such as hook, proof path, edit rhythm, and CTA placement.
- [ ] Rank storyline candidates and angle sheets for an operator before downstream creative production starts.

### Out of Scope

- Video generation as the primary product promise — paused until the reference-first system is trustworthy.
- Copying raw ads, captions, music, or creator expression — blocked for rights and product-quality reasons.
- Autonomous publishing, campaign automation, or learning loops — premature before the upstream reference system is stable.

## Context

- The user reset the near-term goal on 2026-03-18: practical ad work should start with brief decomposition, product facts, market language, platform grammar, and official reference patterns.
- Existing repo artifacts under `openspec/changes/research-editorial-shortform-test-flow/` and `.planning/reference-library/` remain useful because they already define reference intake, taxonomy, and rights-safe normalization rules.
- The current `.planning/ROADMAP.md` was human-readable but not GSD-readable. The pivot includes rebuilding project docs so GSD can track the new scope cleanly.
- Symphony-style guidance is adopted locally through repo docs: one active lane per roadmap item/change, durable workpads, evidence-backed status, and review before closure.

## Constraints

- **Workflow**: Use GSD-compatible planning artifacts as the durable source of truth.
- **Rights**: Extract structure, taxonomy, and metadata; do not store or reuse copyrighted creatives beyond approved/licensed cases.
- **Sources**: Prefer official platform surfaces and first-party product truth before broader crawling.
- **Tech stack**: Keep the current monorepo, packages, and existing runtime assets unless a later phase explicitly replaces them.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Pivot to reference-first | The user explicitly paused video-first execution in favor of brief decomposition and reference-driven planning. | — Pending |
| Treat video/runtime as downstream | Existing generation code is still useful, but it should consume approved briefs later instead of defining the product today. | — Pending |
| Official-source-first intake | Creative Center, Ads guidance, Ad Library, Trends, PDP copy, and first-party assets are higher-signal and safer than generic crawling. | ✓ Good |
| Mimic structure, not expression | The system should borrow hook/proof/CTA structure, never copyrighted expression. | ✓ Good |
| Rebuild GSD planning docs first | ROADMAP/PROJECT/STATE must become GSD-readable before the new execution loop can be tracked safely. | ✓ Good |

---
*Last updated: 2026-03-18 after quick task 260318-1vk*
