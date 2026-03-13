## Context

The repository already has a live-validation workflow and a historical Veo script, but the current paths are uneven. The public product-analysis image generator is stub-backed, the model-composite image path is closer to live behavior but tied to S3, and the existing Veo script uses hardcoded file paths from another machine. The user wants the first test step to answer a narrow question: can we create a real image or a real video through the provider API?

## Goals / Non-Goals

**Goals:**
- Add one direct Imagen smoke script and one direct Veo smoke script.
- Make both scripts executable from local CLI arguments and stable artifact directories.
- Separate provider validation from full application validation.
- Keep the implementation small enough to run before deeper orchestration work.

**Non-Goals:**
- Reworking the full API routes or queue workers.
- Standardizing all provider adapters in this change.
- Building a generalized benchmarking framework.

## Decisions

### Decision 1: Use standalone scripts instead of routing through Hono endpoints
- **Choice:** Implement smoke tests in `apps/api/scripts/` with `tsx` execution.
- **Why:** The user's first question is provider reachability and output quality, not application runtime health.
- **Alternative considered:** Hitting the authenticated API routes. Rejected because auth, DB, Redis, and S3 would obscure first-failure diagnosis.

### Decision 2: Persist artifacts under a single live-smoke root
- **Choice:** Save outputs under `artifacts/live-media-smoke/<run-id>/`.
- **Why:** Repeated runs need comparable output locations and stable evidence for debugging.
- **Alternative considered:** Writing into the existing `apps/api/scripts/output/` directory. Rejected because it mixes old one-off outputs with new smoke evidence.

### Decision 3: Accept local file input for Veo smoke and text prompt input for Imagen smoke
- **Choice:** The Veo script takes a local image path and optional prompt overrides; the Imagen script takes a text prompt and optional output name.
- **Why:** This matches the two minimum provider capabilities we need to prove first.
- **Alternative considered:** Supporting remote URLs and composite prompts immediately. Deferred to keep the first step small.

## Risks / Trade-offs

- [Risk] Gemini model names or payload shapes may drift from older repository code. → Mitigation: align smoke scripts to current official docs and store raw responses for easy diffing.
- [Risk] Live smoke runs consume provider quota. → Mitigation: default to one image and one short video per run and keep prompts minimal.
- [Risk] The smoke path could be mistaken for end-to-end validation. → Mitigation: document that these scripts prove provider health only, not full worker or API readiness.
