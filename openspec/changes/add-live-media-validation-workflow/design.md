## Context

The repository already has strong mocked/unit coverage for media planning, prompt compilation, worker orchestration, and route contracts. It also has ad hoc operational scripts such as `apps/api/scripts/test-veo-pipeline.ts` and media validation utilities under `tooling/`. However, the team still lacks one canonical workflow for repeated live validation.

The current state has two important constraints:
- Direct Gemini validation is now possible because the Gemini API key is valid.
- Full authenticated API validation is still conditional on local runtime dependencies and auth/session setup.
- `/api/v1/products/analyze` currently uses stubbed vision adapters, so that path cannot be claimed as real provider-backed product research without an explicit gap marker.

## Goals / Non-Goals

**Goals:**
- Provide one repeatable live-validation workflow that can be executed from bash.
- Distinguish `direct-provider`, `full-stack`, `stubbed`, and `blocked` stages before any run begins.
- Reuse existing technical validation (`tooling/validate-media.mjs`) and `ffmpeg` utilities instead of inventing a parallel review stack.
- Use Gemini to produce structured creative feedback over sampled video frames so the team can compare outputs across repeated iterations.
- Persist run artifacts in a stable location with a summary that identifies the best candidate and next actions.

**Non-Goals:**
- Replacing the existing mocked/unit test suite.
- Solving every full-stack runtime dependency gap in this change.
- Re-architecting the media generation pipeline itself.
- Claiming that stub-backed product analysis is equivalent to real provider-backed analysis.

## Decisions

### Decision 1: Split validation into `Track A` and `Track B`
- **Choice:** Define `Track A` as direct-provider live validation and `Track B` as full-stack API live validation.
- **Why:** Direct Gemini review and direct Veo/Imagen calls can run before DB/Redis/auth are ready, while full-stack API validation has stricter runtime prerequisites.
- **Alternative considered:** Force all validation through the full API.
  - Rejected because it would block progress whenever DB/Redis/S3/auth are unavailable.

### Decision 2: Use bash as the orchestration layer
- **Choice:** Implement the loop as a bash script that calls existing Node tooling, `ffmpeg`, `ffprobe`, and Gemini via `curl`.
- **Why:** The user asked for a bash-driven operational path, and shell orchestration keeps the run transparent and easy to debug.
- **Alternative considered:** Build a Node-only validation runner.
  - Rejected because bash is the simpler and more direct operator-facing layer here.

### Decision 3: Review videos through sampled frames plus technical metadata
- **Choice:** Extract representative frames from each video, combine them with the source product image and technical validation output, and send that bundle to Gemini.
- **Why:** Gemini review becomes cheaper and simpler than a full video file-upload path while still allowing product-truth and narrative checks.
- **Alternative considered:** Upload raw videos directly to Gemini.
  - Rejected for now because frame sampling is simpler to automate and easier to compare across many iterations.

### Decision 4: Fail closed on stubbed or blocked stages
- **Choice:** The workflow must explicitly label stages as `stubbed` or `blocked` rather than reporting them as passed.
- **Why:** The team needs trustworthy operational evidence, not optimistic reporting.
- **Alternative considered:** Omit blocked stages from the summary.
  - Rejected because silent omission hides real validation gaps.

## Risks / Trade-offs

- [Risk] Frame sampling can miss moments that occur between sampled timestamps. → Mitigation: sample multiple timestamps and preserve the ability to expand to more frames or direct video upload later.
- [Risk] Gemini review may be subjective or inconsistent across runs. → Mitigation: force structured JSON, fixed criteria, and low-temperature responses.
- [Risk] Full-stack API validation may still remain blocked by DB/Redis/S3/auth setup. → Mitigation: keep direct-provider validation useful on its own and record blocked reasons explicitly.
- [Risk] Live review artifacts can become noisy or too large if raw binaries are committed. → Mitigation: keep temporary frame extraction ephemeral and commit only compact summaries if needed.

## Migration Plan

1. Add the live-media-validation spec and tasks.
2. Implement the bash review loop that reuses `tooling/validate-media.mjs`.
3. Run the loop against a fixed source image and five candidate videos.
4. Persist the summary under `artifacts/gemini-review-loop/`.
5. In a later follow-up, add `Track B` preflight and authenticated full-stack execution when runtime dependencies are available.

## Open Questions

- Should the next phase implement real provider-backed image analysis adapters for `/api/v1/products/analyze`, or keep product research as a direct-provider script outside the API first?
- Do we want to commit per-iteration JSON reports, or only the aggregate summary?
- Should future loops rank candidates only by Gemini scores, or by a weighted combination of Gemini review plus technical validation plus business heuristics?
