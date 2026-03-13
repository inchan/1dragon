## Context

The existing `tooling/gemini-video-review-loop.sh` already performs frame sampling and Gemini review through the API, but its rubric is still broad and allows technically valid yet commercially useless outputs to rank too highly. The user wants the loop to validate the true goal of the product: short-form ads that feature a person, demonstrate the product actively, convey a message, and end with a CTA. The user also proposed using Gemini CLI in headless mode from bash, which is available locally but currently shows capacity and environment noise that must be handled safely.

## Goals / Non-Goals

**Goals:**
- Add an ad-focused review rubric with explicit blocking failures.
- Support Gemini reviewer backend selection with CLI and API options.
- Preserve stable artifact output across both reviewer backends.
- Keep the default operational path reliable even when CLI is unavailable or rate-limited.

**Non-Goals:**
- Replacing the media generation pipeline itself.
- Solving model-composite quality in this change.
- Treating Gemini review as the only source of truth for technical validity.

## Decisions

### Decision 1: Keep API as the stable reviewer contract and add CLI as an optional backend
- **Choice:** Retain API review as the canonical stable path while adding `cli` and `cli-then-api` reviewer modes.
- **Why:** The API path already has a predictable JSON contract; CLI is valuable for local headless operation but less predictable under quota and environment noise.
- **Alternative considered:** Replace the API path completely with CLI.
  - Rejected because the CLI currently emits local environment warnings and can fail with capacity errors unrelated to the reviewed media.

### Decision 2: Split scoring from blocking failures
- **Choice:** Keep numeric scoring for ranking, but introduce explicit blocking failures for missing human presence, active demo, story, message, and CTA.
- **Why:** A candidate can have decent visual quality and still be unusable as an ad.
- **Alternative considered:** Encode everything as weighted scores only.
  - Rejected because product-only videos were already scoring as acceptable despite failing the actual business goal.

### Decision 3: Pass expected ad brief fields into the review prompt
- **Choice:** Allow operators to pass hook, message, audience, and CTA expectations into the loop so Gemini can compare output against intended conversion goals.
- **Why:** Review without the intended brief only measures generic creative quality, not campaign fit.
- **Alternative considered:** Infer message and CTA solely from the output.
  - Rejected because inference alone is too loose for fail-closed ad validation.

## Risks / Trade-offs

- [Risk] CLI output may include non-JSON noise or capacity failures. → Mitigation: capture stdout/stderr separately, extract JSON robustly, and allow fallback to API.
- [Risk] Ad-focused hard fails may be too strict for exploratory research. → Mitigation: make required checks configurable while defaulting to strict ad mode.
- [Risk] Gemini review can still hallucinate critique claims. → Mitigation: include expected brief fields and keep structured blocking reasons traceable in saved artifacts.
