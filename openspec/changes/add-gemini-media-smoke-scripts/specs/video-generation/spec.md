## ADDED Requirements

### Requirement: Direct-provider validation precedes full pipeline debugging
The system SHALL allow operators to validate provider health with a direct-provider smoke path before concluding that the full video worker pipeline is broken.

#### Scenario: Smoke path used for first diagnosis
- **WHEN** the team starts debugging video generation regressions
- **THEN** the repository provides a documented direct-provider smoke path that can isolate Gemini Veo behavior from worker orchestration, queueing, and persistence layers
