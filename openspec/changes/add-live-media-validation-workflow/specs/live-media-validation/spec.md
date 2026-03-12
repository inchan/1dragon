## ADDED Requirements

### Requirement: Live media validation SHALL classify each stage before execution
The system SHALL classify each validation stage as `direct-provider`, `full-stack`, `stubbed`, or `blocked` before a live run starts. A stage marked `stubbed` or `blocked` MUST NOT be reported as a passed live validation stage.

#### Scenario: Stub-backed analysis is not treated as live pass
- **WHEN** the configured analysis path uses a stubbed adapter instead of a real provider-backed model
- **THEN** the validation run SHALL mark that stage as `stubbed` and SHALL exclude it from live-pass claims

#### Scenario: Missing runtime dependency blocks full-stack validation
- **WHEN** DB, Redis, S3, or auth/session prerequisites are missing for an API-backed validation stage
- **THEN** the validation run SHALL mark that stage as `blocked` and SHALL record the missing prerequisites in the report

### Requirement: Bash review loop SHALL execute technical validation and Gemini review for each iteration
The system SHALL provide a bash-driven loop that, for each iteration, runs technical media validation, samples representative video frames, sends the source image and frames to Gemini, and stores a structured review artifact.

#### Scenario: Iteration review artifact is created
- **WHEN** a candidate video is processed by the loop
- **THEN** the loop SHALL write a technical validation report, a normalized Gemini review JSON artifact, and an iteration summary

### Requirement: Gemini review output SHALL be structured and actionable
The Gemini review step SHALL return structured feedback that includes a verdict, scored criteria, strengths, weaknesses, and next-action recommendations.

#### Scenario: Gemini review returns normalized feedback
- **WHEN** Gemini evaluates a sampled video iteration
- **THEN** the saved review artifact SHALL include scores for hook, product truth, scene diversity, narrative clarity, CTA clarity, and visual quality, plus actionable improvement guidance

### Requirement: Loop summary SHALL rank repeated iterations and recommend the next move
The system SHALL aggregate repeated iteration results into a loop summary that identifies the best candidate, highlights common failure themes, and recommends the next improvement step.

#### Scenario: Five-iteration summary identifies best candidate
- **WHEN** the review loop completes five iterations
- **THEN** the summary SHALL rank all candidates, identify the top result, and record the most important follow-up actions for the next run
