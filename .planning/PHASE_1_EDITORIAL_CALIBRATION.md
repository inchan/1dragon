# Phase 1 Editorial Calibration

> **2026-03-18 Pivot Note**
> This document captures the previous video-first Phase 1 closeout path.
> It is retained as experiment history and downstream validation context, but it is no longer the active Phase 1 definition.
> The active Phase 1 source of truth is now `.planning/ROADMAP.md` under `Phase 1: Reset Product Source of Truth`.

## Item

- Name: Editorial shortform Phase 1 calibration closeout
- Phase: 1
- Owner: Codex / Ralph loop
- Status: in_progress

## Outcome

- User/operator outcome: Produce one judged editorial shortform batch that operators can label consistently and use to decide the next PM control.
- Why now: The active OpenSpec change is blocked only by calibration evidence and PM default decisions.
- Explicit non-goals:
  - Production hook x CTA matrix testing
  - New message spines or wider persona presets
  - Broad studio UI expansion before calibration evidence exists

## Team

- Lead / Orchestrator: Codex
- Analyst / PM: Codex with judged-set decision memo
- Researcher / Dependency Expert: calibration doc + existing outputs + provider/runtime checks
- Architect / Planner: roadmap item + fixed-batch protocol
- Executor: shortform smoke/batch runs and artifact assembly
- Test Engineer: script syntax checks + run-path validation
- Verifier / Reviewer: review-loop outputs, calibration summary, judged template completeness

## Explore

- Current code paths:
  - `tooling/gemini-shortform-test-flow.sh`
  - `tooling/gemini-video-review-loop.sh`
  - `apps/api/src/application/media/editorial-calibration.ts`
- Related specs / OpenSpec changes:
  - `openspec/changes/research-editorial-shortform-test-flow`
  - `docs/06-operations/EDITORIAL_SHORTFORM_WAVE2_CALIBRATION.md`
- Current artifacts / runtime evidence:
  - Existing local MP4 candidates under `apps/api/scripts/output/`
  - Source product image confirmed at `/Users/inchan/workspace/1dragon/tmp/framecheck/run1-01.png`
  - One successful smoke run under `artifacts/shortform-test-flow/20260314-134007-phase1-qpc-smoke/`
  - Pilot batch evidence under `artifacts/shortform-calibration-batch/20260314-134549-phase1-pilot/`
  - QPC batch evidence under `artifacts/shortform-calibration-batch/20260314-135341-phase1-batch/`
  - DSD-only retry evidence under `artifacts/shortform-calibration-batch/20260314-140741-phase1-batch-dsd/`
- Known unknowns:
  - Whether one 12-sample first batch is sufficient to close 4.1, or only to justify a follow-up 20-30 sample wave
  - Whether Korean editorial talent should be global for KR fashion or preset-only after the first judged set

## Research

- Official docs to read:
  - `docs/06-operations/EDITORIAL_SHORTFORM_WAVE2_CALIBRATION.md`
  - `README.md` shortform and review-loop sections
- Provider / dependency constraints:
  - Requires working Gemini composite/video/review credentials from `.env.test`
  - Requires provider latency tolerance for multi-run batch execution
- Human/operator evidence needed:
  - Filled `sample-judging-template` per sample
  - Batch-level disagreement notes between auto recommendation and human label
  - One explicit PM control decision after the first judged set

## Analyze

- Root cause: The code path is implemented, but there is no judged-set evidence tying the score bands to human review or selecting a control spine/talent policy.
- Smallest useful slice: Validate one end-to-end smoke run, then generate a controlled 12-sample batch with constant product, talent brief, and CTA mode.
- Risks:
  - Runtime/provider failures during composite or video generation
  - Gemini Veo rate limiting can block sustained DSD generation even when the same harness succeeds for QPC
  - Missing or inconsistent human labeling after artifacts are produced
  - False PM confidence if the first batch is too small or too noisy
- PM decisions required:
  - Next-round control spine: `QUESTION_PROOF_CHOICE` vs `DETAIL_SILHOUETTE_DECISION`
  - Korean editorial talent scope: global KR fashion default vs preset-only

## Plan

- Active OpenSpec change: `research-editorial-shortform-test-flow`
- Acceptance criteria:
  - One successful E2E shortform smoke run produces review and calibration artifacts
  - One documented 12-sample batch protocol exists with fixed control variables
  - Judged-set outputs support either threshold tuning or an explicit no-change decision
  - PM default decision rubric is written down before closeout
- Verification method:
  - Runtime artifact existence
  - Script exit success
  - Calibration summary + judging template presence
  - OpenSpec tasks updated only when evidence is real
- Parallelizable work:
  - Existing-output inspection
  - Judging packet/document preparation
  - Runtime smoke verification

## Implement

- Code/workflow changes:
  - Add this execution brief
  - Run E2E smoke
  - Materialize the controlled batch command set
  - Add absolute-path normalization to the shortform harness so repo-relative `--image` inputs work through the `@1dragon/api` smoke commands
  - Add a calibration batch runner with per-run manifest output, retry logic, spine subset selection, and delay/backoff controls
- Files/modules touched:
  - `.planning/PHASE_1_EDITORIAL_CALIBRATION.md`
  - `tooling/gemini-shortform-test-flow.sh`
  - `tooling/gemini-shortform-calibration-batch.sh`
  - `package.json`

## Test

- Target tests:
  - `bash -n tooling/gemini-shortform-test-flow.sh`
  - `bash -n tooling/gemini-video-review-loop.sh`
  - `bash -n tooling/gemini-shortform-calibration-batch.sh`
- Manual checks:
  - Source image exists and is readable
  - Review/calibration artifacts are created in the expected directories
- Runtime checks:
  - `pnpm media:smoke:shortform -- ...`
  - `pnpm media:smoke:shortform:calibration -- --image tmp/framecheck/run1-01.png --runs-per-spine 1 --run-name phase1-pilot`
  - `pnpm media:smoke:shortform:calibration -- --image tmp/framecheck/run1-01.png --runs-per-spine 6 --run-name phase1-batch`
  - `pnpm media:smoke:shortform:calibration -- --image tmp/framecheck/run1-01.png --runs-per-spine 6 --spines DETAIL_SILHOUETTE_DECISION --run-name phase1-batch-dsd --max-attempts 3 --inter-run-delay-seconds 30 --retry-delay-seconds 120`

## Verify

- Evidence collected:
  - One successful end-to-end QPC smoke run including `artifact-index`, `review-brief`, `loop-summary`, `calibration-summary`, and `sample-judging-template`
  - One successful 2-run pilot batch with `QUESTION_PROOF_CHOICE` and `DETAIL_SILHOUETTE_DECISION`
  - Six completed QPC batch runs with saved judging templates and review summaries
  - One completed DSD pilot run with saved judging template and review summary
- Did the item achieve the actual outcome:
  - Partially. The harness and batch workflow are verified, but the 12-sample judged set is not yet complete because the DSD batch is blocked by persistent Veo 429 responses.
- Residual risks:
  - Human judgment remains required even if the smoke path works
  - DSD generation is currently quota-limited, so the remaining five DSD samples must be resumed later when Veo capacity is available

## Review

- Findings:
  - Phase 1 must stay on the narrow two-spine calibration path, not the production A/B matrix
  - Relative image paths were broken through the `@1dragon/api` smoke boundary and had to be normalized to absolute paths
  - Provider flake (`completed without downloadable video URI`) is recoverable with per-run retries
  - Provider rate limiting (`429`) is the current hard blocker for completing the DSD half of the batch
  - Auto recommendations are not uniformly perfect: current evidence is `QPC 6 runs => 5 pass / 1 fail`, `DSD 1 pilot => 1 pass`
- Follow-up fixes:
  - Resume the DSD-only batch after Veo quota/window resets
  - Once five more DSD samples exist, assemble the combined 12-sample labeling packet and have operators fill the saved templates
  - Only after human labels exist, decide whether thresholds stay fixed or move by `3-5` points and close OpenSpec tasks `4.1` and `4.3`
- Decision:
  - escalate
