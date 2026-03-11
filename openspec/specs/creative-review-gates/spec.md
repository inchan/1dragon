# creative-review-gates Specification

## Purpose
Define the self-critique and fact-check gates that must approve story planning artifacts before generation proceeds.
## Requirements
### Requirement: Each generation stage SHALL run self-critique before proceeding
The system SHALL run a self-critique step for each major generation stage: story brief, concept selection, shot planning, prompt compilation, and output review. The critique MUST identify weaknesses such as narrative duplication, weak proof, unclear CTA, or mismatch with target viewer.

#### Scenario: Self-critique blocks weak story brief
- **WHEN** a story brief only restates product features without a hook, proof beat, or payoff
- **THEN** the system SHALL flag the brief as insufficient and SHALL require revision before moving to shot planning

### Requirement: Review findings SHALL be fact-checked against stage artifacts
The system SHALL validate critique claims against explicit stage artifacts before allowing a rejection or approval. Fact checks MUST be grounded in structured evidence such as story brief fields, shot cards, compiled prompt mappings, or output keyframes.

#### Scenario: Fact-check validates critique claim
- **WHEN** a critique claims that the CTA is missing from the planned story
- **THEN** the system SHALL verify the claim against the story brief and shot cards before marking the stage as failed

### Requirement: Review gate outputs SHALL be structured and traceable
The system SHALL record review outputs using the fields `fact`, `inference`, `risk`, `decision`, and `nextStep` so downstream stages and debugging tools can trace why a plan was accepted, revised, or rejected.

#### Scenario: Review artifact persists decision trace
- **WHEN** a stage completes review
- **THEN** the system SHALL emit a structured review artifact containing the critique, fact-check result, final decision, and next step
