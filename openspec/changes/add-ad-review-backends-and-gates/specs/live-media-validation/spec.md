## MODIFIED Requirements

### Requirement: Bash-driven live video review loop
The system SHALL provide a bash-driven loop that, for each iteration, runs technical media validation, samples representative video frames, reviews the source image and frames with Gemini, and stores a structured review artifact. The loop SHALL support a selectable reviewer backend of `api` or `cli`, and MAY support a CLI-first flow with API fallback.

#### Scenario: API reviewer backend
- **WHEN** an operator runs the loop with the API backend
- **THEN** the loop SHALL send the review prompt and sampled images directly to Gemini through the HTTP API and store the raw response and normalized review summary

#### Scenario: CLI reviewer backend
- **WHEN** an operator runs the loop with the CLI backend and Gemini CLI is available
- **THEN** the loop SHALL run Gemini CLI in headless mode against the local review inputs and store the raw CLI output, stderr log, and normalized review summary

#### Scenario: CLI reviewer fallback
- **WHEN** the loop is configured to try CLI first and the CLI reviewer fails
- **THEN** the loop SHALL record the CLI failure and continue with the configured fallback backend instead of silently passing the iteration

### Requirement: Ad-focused review artifacts
The system SHALL record ad-focused review artifacts that can distinguish technical success from marketing failure.

#### Scenario: Blocking ad failures are persisted
- **WHEN** Gemini review determines that a candidate lacks a visible person, active demonstration, clear message, story progression, or CTA
- **THEN** the iteration summary SHALL record those blocking failures explicitly and SHALL mark the candidate as failed even if technical validation passed

#### Scenario: Aggregate summary surfaces repeated blockers
- **WHEN** multiple iterations complete
- **THEN** the loop summary SHALL aggregate common blocking failures and ad-check results so the team can identify systemic weaknesses across candidates
