## Why

The team needs a trustworthy first-step test flow that proves whether Gemini can generate a real image and a real image-to-video output from the API, without depending on the full application runtime. Right now the repository mixes live-provider paths, stub-backed adapters, and hardcoded one-off scripts, which makes it hard to tell whether failures come from Gemini, local setup, or our product code.

## What Changes

- Add direct-provider Gemini smoke scripts for image generation and image-to-video generation.
- Standardize artifact output so live smoke runs save prompts, raw responses, and media outputs under a predictable directory.
- Document the minimum environment and execution order for the first validation step.
- Update the existing ad hoc Veo test path to use local arguments instead of machine-specific hardcoded paths.

## Capabilities

### New Capabilities
- `media-api-smoke-tests`: Provide direct Gemini smoke scripts that can generate one image and one short video, persist artifacts, and fail clearly when required inputs or keys are missing.

### Modified Capabilities
- `video-generation`: Clarify that the first operational validation step may use a direct-provider smoke path before full worker orchestration is considered healthy.

## Impact

- Affected code: `apps/api/scripts/*`, `apps/api/package.json`, root `package.json`, and `README.md`.
- Affected systems: Google Gemini API, local filesystem artifact storage, and existing live-validation workflow.
- Dependencies: `GEMINI_IMAGEN_API_KEY` and/or `GEMINI_VEO_API_KEY`, plus a local source image for the video smoke path.
