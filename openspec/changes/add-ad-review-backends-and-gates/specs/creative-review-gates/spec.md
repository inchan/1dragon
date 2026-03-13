## MODIFIED Requirements

### Requirement: Review findings SHALL be fact-checked against stage artifacts
The system SHALL validate critique claims against explicit stage artifacts before allowing a rejection or approval. Fact checks MUST be grounded in structured evidence such as story brief fields, shot cards, compiled prompt mappings, output keyframes, and expected ad brief fields such as the intended hook, message, audience, or CTA.

#### Scenario: Fact-check validates critique claim
- **WHEN** a critique claims that the CTA is missing from the planned story
- **THEN** the system SHALL verify the claim against the story brief, shot cards, or expected ad brief inputs before marking the stage as failed

### Requirement: Ad review SHALL fail closed on missing conversion-critical elements
The system SHALL reject ad candidates that are technically valid but still fail core advertising requirements such as human presence, active product demonstration, message clarity, story progression, or CTA presence when those checks are required for the review profile.

#### Scenario: Product-only candidate is rejected
- **WHEN** output review finds that the video only shows a static product with passive framing changes and no visible person
- **THEN** the review gate SHALL mark the candidate as failed and SHALL record blocking failure reasons instead of allowing a revise-or-pass result

#### Scenario: Message or CTA is missing
- **WHEN** output review finds that the candidate does not communicate the intended message or land with an understandable CTA
- **THEN** the review gate SHALL mark the candidate as failed and SHALL record the missing ad elements in the structured review artifact
