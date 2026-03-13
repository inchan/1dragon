## ADDED Requirements

### Requirement: Story planner SHALL create a structured story brief before prompt compilation
The system SHALL derive a structured story brief from image analysis, style, copy, and creative context before generating provider prompts. The story brief MUST include target viewer, core promise, hook, proof strategy, emotional payoff, and CTA.

#### Scenario: Story brief creation before generation
- **WHEN** a valid media generation request starts
- **THEN** the system SHALL create a story brief artifact before shot planning or provider prompt compilation begins

### Requirement: Story planner SHALL generate distinct concept candidates for the same input
The system SHALL generate multiple concept candidates for a given input and SHALL select one concept family for execution. Concept candidates MUST differ in hook angle, proof beat, or payoff structure rather than camera phrasing alone.

#### Scenario: Concept diversity for identical image input
- **WHEN** the same image is submitted for repeated generation without a concept lock
- **THEN** the planner SHALL produce a concept candidate set whose selected concept differs in narrative structure from recent runs

### Requirement: Story planner SHALL output shot cards that can drive prompt compilation
The system SHALL transform the approved story brief into shot cards. Each shot card MUST include scene intent, actor or product action, visual proof target, background or context, camera direction, and target payoff.

#### Scenario: Shot cards become prompt input
- **WHEN** the planner approves a concept
- **THEN** the system SHALL produce shot cards that the prompt compiler can map into provider-specific prompts
