# content-generation Specification

## Purpose
TBD - created by archiving change 1dragon-mvp-foundation. Update Purpose after archive.
## Requirements
### Requirement: Marketing copy auto-generation
The system SHALL generate Korean marketing copy using GPT-4o API. Input MUST include product_name, image analysis results (category, keywords, mood), and selected style. Output MUST include 3 variant copy sets, each containing: hook_copy (1~3 second hook), body_copy (2~3 sentences product description), cta_copy (call-to-action), hashtags (5 recommended hashtags).

#### Scenario: Successful copy generation
- **WHEN** product analysis and style selection are complete
- **THEN** GPT-4o generates 3 variant copy sets within 3 seconds, each with hook, body, CTA, and hashtags in Korean

#### Scenario: Advertising regulation compliance
- **WHEN** generated copy contains exaggerated expressions ("최고", "100%", "완벽한", "기적의")
- **THEN** the system auto-flags the expression with a warning and suggests a compliant alternative

#### Scenario: Platform-specific tone adjustment
- **WHEN** target platform is TikTok
- **THEN** the copy tone is casual and uses trending expressions
- **WHEN** target platform is Instagram Reels
- **THEN** the copy tone is emotional and aesthetic
- **WHEN** target platform is YouTube Shorts
- **THEN** the copy tone is informational and descriptive

#### Scenario: GPT-4o failure fallback
- **WHEN** GPT-4o API fails or times out after 5 seconds
- **THEN** the system falls back to Claude Haiku for copy generation

#### Scenario: Product name only (analysis failure)
- **WHEN** image analysis failed but product name is available
- **THEN** the system generates generic category-based copy using product name only

---

### Requirement: Background music auto-selection
The system SHALL automatically match royalty-free BGM tracks to the product based on category, mood, and style. Free tier MUST have access to 20 basic tracks. Starter tier MUST have access to 200+ tracks plus Udio AI-generated music. All BGM MUST be commercially licensed and cleared for TikTok/YouTube/Instagram.

#### Scenario: Auto-match BGM
- **WHEN** product analysis returns mood "활기찬" and style "다이내믹"
- **THEN** the system selects a high-BPM, energetic track from the library matching both attributes

#### Scenario: Free tier BGM library
- **WHEN** a Free tier user generates a video
- **THEN** BGM is selected from the 20-track basic library only

#### Scenario: Starter tier with AI-generated BGM
- **WHEN** a Starter tier user generates a video and no suitable track exists in the library
- **THEN** the system generates a custom BGM track using Udio API matching the mood and style

#### Scenario: Auto-ducking with narration
- **WHEN** the video includes TTS narration
- **THEN** BGM volume is automatically reduced by -12dB during narration segments

#### Scenario: Auto fade-in/fade-out
- **WHEN** a BGM track is applied to a video
- **THEN** the track has a 0.5-second fade-in at the start and a 1-second fade-out at the end, trimmed to match video length

#### Scenario: BGM-free option
- **WHEN** a user selects "BGM 없음" option
- **THEN** the video is generated without background music

#### Scenario: Udio API failure
- **WHEN** Udio API fails or is unavailable
- **THEN** the system falls back to the closest-matching track from the royalty-free library

---

### Requirement: TTS voice narration
The system SHALL generate Korean TTS narration using Typecast API. MVP MUST provide 3 voice options: 여성 밝은 (Female Bright), 남성 차분 (Male Calm), 여성 전문 (Female Professional). Narration MUST be optional (include/exclude toggle). Speed MUST be adjustable from 0.8x to 1.5x (default 1.0x).

#### Scenario: Narration generation
- **WHEN** a user enables narration with "여성 밝은" voice at 1.0x speed
- **THEN** Typecast generates a WAV audio file from the selected copy text with emotional expression

#### Scenario: Narration disabled
- **WHEN** a user toggles narration off
- **THEN** no TTS audio is generated and the video uses copy text as subtitle-only

#### Scenario: Copy exceeds video length
- **WHEN** the narration text duration exceeds the video length at 1.0x speed
- **THEN** the system suggests text shortening or auto-applies 1.2x speed and notifies the user

#### Scenario: Korean number and mixed-language handling
- **WHEN** copy text contains "15,000원" or English brand names
- **THEN** TTS reads it as "만 오천 원" and attempts natural Korean pronunciation for English words

#### Scenario: Typecast API failure
- **WHEN** Typecast API fails or times out
- **THEN** the system falls back to ElevenLabs, then Google Cloud TTS, and generates narration

---

### Requirement: Automatic subtitle generation
The system SHALL generate synchronized subtitles using Deepgram API for narration-based subtitles, or timed text distribution for copy-only subtitles. Subtitle accuracy (WER) MUST be ≤ 4% for Korean. 3 subtitle styles MUST be available: 심플 흰색 (Simple White), 강조 노란 (Highlight Yellow), 모션 (Word-by-word Motion). Subtitles MUST be placed within the platform-specific safe zone.

#### Scenario: Narration-based subtitle generation
- **WHEN** the video includes TTS narration
- **THEN** Deepgram transcribes the narration with word-level timestamps (±50ms precision) and generates SRT/VTT output

#### Scenario: Copy-only subtitle generation
- **WHEN** the video has no narration (copy text only)
- **THEN** the system distributes copy text across the video timeline with proportional timing per segment

#### Scenario: Safe zone placement
- **WHEN** subtitles are rendered for TikTok (safe zone: top 150px, bottom 270px excluded)
- **THEN** subtitles are positioned within the safe zone, defaulting to lower-center above the bottom safe zone boundary

#### Scenario: Safe zone conflict
- **WHEN** subtitle position overlaps with platform-specific UI elements
- **THEN** the system auto-adjusts subtitle position to upper area or center

#### Scenario: Deepgram API failure
- **WHEN** Deepgram API fails
- **THEN** the system generates subtitles directly from copy text with estimated timing (no speech-based sync)

---

### Requirement: Content generation parallelism
The system SHALL execute copy generation, BGM selection, and Udio generation in parallel after image analysis completes. TTS and subtitle generation MUST execute sequentially after copy generation (since they depend on copy text). This parallel execution MUST reduce total pipeline time.

#### Scenario: Parallel execution
- **WHEN** image analysis completes
- **THEN** copy generation (GPT-4o), BGM selection/generation, and background removal execute simultaneously

#### Scenario: Sequential dependency
- **WHEN** copy generation completes
- **THEN** TTS narration starts (if enabled), followed by subtitle generation after TTS completes

