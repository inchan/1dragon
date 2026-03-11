# video-generation Specification

## Purpose
TBD - created by archiving change 1dragon-mvp-foundation. Update Purpose after archive.
## Requirements
### Requirement: Video style selection with 5 presets
The system SHALL provide 5 video style presets: 심플 (Simple), 다이내믹 (Dynamic), 감성 (Emotional), 트렌디 (Trendy), 프리미엄 (Premium). Each style MUST define camera movement, transition effects, speed, and color grading parameters. The system MUST auto-recommend top 3 styles based on product category and mood analysis.

#### Scenario: Auto-recommendation
- **WHEN** image analysis completes with category "패션" and mood "트렌디"
- **THEN** the system returns 3 recommended styles ranked by relevance with "트렌디" as the top recommendation

#### Scenario: Level 0 automatic mode
- **WHEN** a user proceeds without selecting a style (auto mode)
- **THEN** the top-recommended style is automatically applied without showing the selection UI

#### Scenario: Level 1 selection mode
- **WHEN** a user clicks "스타일 선택" to see options
- **THEN** 5 style cards are displayed each with a 3-second preview animation and the recommended style is highlighted

#### Scenario: Style preview loading failure
- **WHEN** a style preview animation fails to load
- **THEN** a static thumbnail image is shown as fallback

---

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

### Requirement: 4-provider I2V fallback chain
The system SHALL support 4 I2V providers: Runway Gen-4 Turbo, Hailuo 02, Google Gemini Veo, MiniMax. Provider selection MUST follow priority chains based on user plan. Paid users: Runway → Gemini Veo → MiniMax → Hailuo. Free users: Hailuo → MiniMax → Gemini Veo. First video ever: Runway (Best-foot-forward, regardless of plan).

#### Scenario: Paid user successful generation
- **WHEN** a Starter plan user requests video generation
- **THEN** the system attempts Runway Gen-4 Turbo first

#### Scenario: Free user generation
- **WHEN** a Free plan user requests video generation (not first video)
- **THEN** the system uses Hailuo 02 as the primary provider

#### Scenario: First video best-foot-forward
- **WHEN** a user generates their very first video (any plan)
- **THEN** Runway Gen-4 Turbo is used regardless of plan tier to ensure best first impression

#### Scenario: Primary provider failure with fallback
- **WHEN** the primary I2V provider returns a 5xx error or times out
- **THEN** the system immediately attempts the next provider in the fallback chain and logs a failover event

#### Scenario: All providers fail
- **WHEN** all 4 I2V providers fail consecutively
- **THEN** the job status transitions to DEGRADED_FAILED, a retry is queued with exponential backoff, and the user receives "현재 서버가 바쁩니다. 잠시 후 다시 시도해주세요"

---

### Requirement: Circuit breaker per provider
Each I2V provider MUST have an independent circuit breaker. The circuit breaker MUST open after 5 consecutive failures, blocking requests for 30 seconds. After 30 seconds, it enters half-open state allowing 1 trial request. Successful trial closes the circuit. Failed trial resets the 30-second timer.

#### Scenario: Circuit opens after failures
- **WHEN** Runway provider fails 5 consecutive requests
- **THEN** the circuit breaker for Runway transitions to OPEN state and all requests are routed to the next provider

#### Scenario: Half-open recovery
- **WHEN** 30 seconds pass after a circuit opens
- **THEN** one trial request is sent to the provider; if successful, the circuit closes and normal routing resumes

#### Scenario: Independent circuit states
- **WHEN** Runway circuit is OPEN but Hailuo circuit is CLOSED
- **THEN** requests skip Runway and use Hailuo without affecting other providers' circuit states

---

### Requirement: Video generation time SLA
The system MUST generate videos within 60 seconds (p95 target). If generation exceeds 90 seconds, a progress UI with engagement content MUST be shown. If generation exceeds 120 seconds, the job MUST be timed out and retried with a fallback provider.

#### Scenario: Generation within SLA
- **WHEN** a video generation completes in 45 seconds
- **THEN** the user sees a progress bar and receives the video preview immediately upon completion

#### Scenario: Generation exceeds 90 seconds
- **WHEN** generation takes longer than 90 seconds
- **THEN** the UI shows "거의 다 됐어요!" with engagement content ("생성 중에 다른 상품도 올려보세요")

#### Scenario: Generation timeout at 120 seconds
- **WHEN** generation exceeds 120 seconds
- **THEN** the current attempt is canceled, a retry with the next fallback provider is queued, and the user is notified

---

### Requirement: Automatic quality control
The system SHALL perform automatic quality control after video generation. QC MUST measure product similarity score (comparing original product image to product appearance in generated video). If similarity < 70%, the system MUST auto-regenerate (max 2 retries). QC score MUST be stored with the video result.

#### Scenario: QC pass
- **WHEN** the generated video has product similarity score ≥ 70%
- **THEN** the video is marked as SUCCEEDED and made available for preview

#### Scenario: QC fail with auto-retry
- **WHEN** the generated video has product similarity score < 70% and retry count < 2
- **THEN** the system automatically regenerates with the same parameters and increments retry count

#### Scenario: QC fail after max retries
- **WHEN** product similarity score < 70% after 2 auto-retries
- **THEN** the best-scoring result is presented with a "다른 스타일로 다시 만들기" prompt

---

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

### Requirement: Job state machine
Each video generation MUST follow a state machine: QUEUED → ANALYZING → GENERATING → COMPOSING → RENDERING_VARIANTS → SUCCEEDED / FAILED / DEGRADED_FAILED. State transitions MUST be persisted in the `job_events` table (Outbox pattern). Invalid state transitions MUST be rejected.

#### Scenario: Normal flow state transitions
- **WHEN** a video generation proceeds normally
- **THEN** the job transitions through QUEUED → ANALYZING → GENERATING → COMPOSING → RENDERING_VARIANTS → SUCCEEDED

#### Scenario: Invalid state transition
- **WHEN** code attempts to transition a job from QUEUED directly to COMPOSING
- **THEN** the transition is rejected with a domain error "Invalid state transition: QUEUED → COMPOSING"

#### Scenario: State persistence
- **WHEN** a job transitions to a new state
- **THEN** a JobStatusChanged event is written to the job_events table with job_id, previous_status, new_status, timestamp, and metadata

