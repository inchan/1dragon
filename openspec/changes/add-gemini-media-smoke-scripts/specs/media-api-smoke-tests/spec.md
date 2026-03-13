## ADDED Requirements

### Requirement: Direct Gemini image smoke generation
The system SHALL provide a direct-provider smoke script that generates at least one real image through Gemini Imagen without requiring the full API server, queue worker, database, or Redis runtime.

#### Scenario: Successful image smoke run
- **WHEN** an operator runs the image smoke script with a valid Gemini image API key and prompt
- **THEN** the script stores the generated image and request metadata under a deterministic artifact directory and exits successfully

#### Scenario: Missing image API key
- **WHEN** an operator runs the image smoke script without a configured Gemini image API key
- **THEN** the script exits with a clear configuration error before making a provider request

### Requirement: Direct Gemini image-to-video smoke generation
The system SHALL provide a direct-provider smoke script that generates one short real video from a local or remote source image through Gemini Veo without requiring the full worker pipeline.

#### Scenario: Successful video smoke run
- **WHEN** an operator runs the video smoke script with a valid Gemini Veo API key, prompt, and source image
- **THEN** the script submits the Veo job, polls until completion, downloads the output video, stores the raw operation response, and exits successfully

#### Scenario: Missing source image
- **WHEN** an operator runs the video smoke script without a readable source image
- **THEN** the script exits with a clear input error before making a provider request

### Requirement: Artifact traceability for smoke runs
Every smoke run SHALL persist enough artifacts to distinguish provider failures from local integration failures.

#### Scenario: Saved smoke artifacts
- **WHEN** either smoke script completes or fails after reaching the provider
- **THEN** the run directory contains the effective prompt, raw provider response payloads that were received, and a summary file describing the outcome
