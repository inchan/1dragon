## MODIFIED Requirements

### Requirement: Hybrid video generation engine
The system SHALL generate videos using a hybrid approach: story planning → shot planning → prompt compilation → Remove.bg foreground extraction → I2V clip generation → FFmpeg composition with original product overlay. This hybrid approach MUST preserve product identity while also expressing a planned hook, proof beat, and payoff rather than only generic product motion. The output MUST remain 9:16, 1080x1920, 30fps, H.264+AAC.

#### Scenario: Story-planned generation pipeline
- **WHEN** a valid product image, style, copy, BGM, and subtitle data are provided
- **THEN** the system SHALL generate a video by: (1) creating a story brief, (2) selecting a concept, (3) generating shot cards, (4) compiling provider prompts from those shot cards, (5) generating clips, and (6) compositing the final video

#### Scenario: Planned proof beat appears in generated structure
- **WHEN** the planner selects a concept with a specific proof beat
- **THEN** at least one planned shot card SHALL be dedicated to visually proving that promise instead of only showing passive product motion

#### Scenario: Repeated generation changes story, not only micro-motion
- **WHEN** the same product image is generated multiple times without locking a concept
- **THEN** the resulting plans SHALL differ in hook, proof strategy, payoff, or CTA structure rather than only seed or camera micro-variation

### Requirement: Video regeneration
The system SHALL allow users to regenerate videos with "다른 스타일로 다시 만들기" button. Free regeneration MUST be limited to 5 attempts per video. Each regeneration MUST use a different approved concept family or narrative plan, and MAY additionally vary style or random seed.

#### Scenario: Regeneration requests a new story plan
- **WHEN** a user clicks "다른 스타일로 다시 만들기" with remaining free attempts
- **THEN** the system SHALL create a new story plan that is distinct from the current video's concept family before generating the next result

#### Scenario: Regeneration limit reached
- **WHEN** a user has used all 5 free regeneration attempts
- **THEN** the system SHALL show "더 좋은 사진으로 다시 시도해보세요" guide and offer customer support link

### Requirement: Prompt generation for I2V
The system SHALL generate I2V prompts by compiling approved shot cards, product analysis data, selected style parameters, and copy data into provider-specific prompts. Prompt compilation MUST preserve a traceable mapping from each shot card to the corresponding provider prompt segment.

#### Scenario: Prompt compilation from shot cards
- **WHEN** a shot plan is approved
- **THEN** the prompt compiler SHALL generate provider-specific prompts that explicitly reflect the selected hook, proof beat, payoff, and CTA for each planned shot

#### Scenario: Prompt fact-check failure
- **WHEN** fact-check detects that a planned shot card is missing or contradicted in the compiled provider prompt
- **THEN** the system SHALL fail the prompt compilation gate and require prompt regeneration before provider execution
