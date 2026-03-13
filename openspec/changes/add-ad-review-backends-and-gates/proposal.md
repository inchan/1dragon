## Why

The current Gemini review loop can rank videos, but it still behaves like a general creative scorer instead of a strict short-form ad validator. The team now needs the loop to fail closed on missing people, passive motion, missing story, missing message, and missing CTA, while also allowing a headless Gemini CLI reviewer path for local operator workflows.

## What Changes

- Strengthen the live media review loop with ad-specific fail-closed review criteria.
- Add reviewer backend selection so the loop can use Gemini API or Gemini CLI in headless mode.
- Persist structured blocking failures and required-ad checks in iteration summaries and aggregate reports.
- Document how to run the review loop in ad-review mode and when CLI should fall back to API.

## Capabilities

### New Capabilities

### Modified Capabilities
- `live-media-validation`: Add reviewer backend selection and ad-focused review artifacts for repeated live validation.
- `creative-review-gates`: Extend output review to require explicit validation of human presence, active product demonstration, message clarity, and CTA presence for ad use cases.

## Impact

- Affected code: `tooling/gemini-video-review-loop.sh`, root `package.json`, `README.md`, and related artifacts under `artifacts/gemini-review-loop/`.
- Affected systems: Gemini API reviewer path, Gemini CLI headless reviewer path, local `ffmpeg`/`ffprobe` review pipeline, and operator review workflow.
- Dependencies: `gemini` CLI availability for CLI backend, Gemini credentials for CLI or API backend, and existing sample videos/images.
