## Why

The team needs a repeatable live-validation workflow that can evaluate real media outputs with Gemini instead of relying only on mocked tests. Right now technical tests are strong, but product research, image generation, and video review are not consistently verified through a single operational loop, and some API paths are still stub-backed or blocked by local runtime dependencies.

## What Changes

- Add a live media validation workflow that separates direct-provider validation from full-stack API validation.
- Add a bash-driven review loop that runs technical media checks, extracts representative frames, sends them to Gemini for structured review, and ranks results across repeated iterations.
- Standardize live-validation artifacts so each run records inputs, technical validation results, Gemini feedback, final ranking, and next actions.
- Explicitly classify blocked or stub-backed stages so the team does not mistake simulated analysis for real provider-backed validation.

## Capabilities

### New Capabilities
- `live-media-validation`: Defines the operational workflow for real-provider and real-API media validation, including preflight checks, Gemini review, artifact capture, and iteration ranking.

### Modified Capabilities

## Impact

- Affected code: `tooling/*.mjs`, new bash validation orchestration in `tooling/`, media artifact output under `artifacts/`, and OpenSpec documentation for live validation.
- Affected systems: Google Gemini API, local `ffmpeg`/`ffprobe`, existing media artifacts, and any future authenticated full-stack runtime validation path.
- Dependencies: valid Gemini API key, local source image, generated video files, and optionally DB/Redis/S3/auth for full API validation.
