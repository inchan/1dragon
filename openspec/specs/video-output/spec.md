# video-output Specification

## Purpose
TBD - created by archiving change snapvid-mvp-foundation. Update Purpose after archive.
## Requirements
### Requirement: In-app video preview
The system SHALL provide immediate in-app video preview upon generation completion. Preview MUST support full-screen playback. Preview MUST show platform-specific safe zone overlays (TikTok/Shorts/Reels) as toggleable visual guides.

#### Scenario: Preview after generation
- **WHEN** video generation completes successfully
- **THEN** the video auto-plays in the preview player with playback controls (play/pause, seek, volume)

#### Scenario: Safe zone overlay toggle
- **WHEN** user toggles "TikTok" safe zone overlay
- **THEN** semi-transparent overlay shows TikTok's UI element areas (top 150px, bottom 270px) on the preview

#### Scenario: Preview loading failure
- **WHEN** the preview video fails to load (network error)
- **THEN** a thumbnail image is shown with a "다시 로드" button

---

### Requirement: Video download
The system SHALL allow direct MP4 download of generated videos. File naming MUST follow the pattern: `[상품명]_[플랫폼]_[YYYYMMDD].mp4`. Download MUST be available for all platform variants the user has access to.

#### Scenario: Single video download
- **WHEN** a user clicks the download button for a TikTok variant
- **THEN** the browser downloads the MP4 file named `{product_name}_tiktok_{date}.mp4`

#### Scenario: All variants download
- **WHEN** a Starter user clicks "전체 다운로드"
- **THEN** all 3 platform variants are downloaded as individual files (not zipped)

---

### Requirement: Multi-platform variant rendering
The system SHALL generate platform-optimized video variants from a single master render. Supported platforms: TikTok (9:16, 1080x1920, 15~30s, safe zone top 150px/bottom 270px), YouTube Shorts (9:16, 1080x1920, 30~60s, safe zone top 100px/bottom 200px), Instagram Reels (9:16, 1080x1920, 15~30s, safe zone top 120px/bottom 250px). All variants MUST use H.264+AAC codec at 8~12 Mbps.

#### Scenario: Free tier single variant
- **WHEN** a Free tier user generates a video
- **THEN** only 1 platform variant is generated (user's selection, default TikTok)

#### Scenario: Starter tier triple variant
- **WHEN** a Starter tier user generates a video
- **THEN** 3 platform variants (TikTok, Shorts, Reels) are generated simultaneously from the master render

#### Scenario: Platform-specific safe zone adaptation
- **WHEN** variants are rendered for each platform
- **THEN** subtitle positions, CTA placement, and text overlays are adjusted per platform's safe zone specifications

#### Scenario: Bitrate auto-adjustment
- **WHEN** a rendered variant exceeds the platform's file size limit
- **THEN** bitrate is automatically reduced while maintaining quality above acceptable threshold

---

### Requirement: Watermark policy
Free tier videos MUST include a "Made with SnapVid" watermark that cannot be removed. Starter tier videos MUST have optional watermark (user choice). Starter users who include the watermark MUST receive +5 bonus credits per month.

#### Scenario: Free tier watermark
- **WHEN** a Free tier user generates a video
- **THEN** "Made with SnapVid" watermark is applied to the bottom-right corner of all variants and cannot be removed

#### Scenario: Starter tier watermark opt-in
- **WHEN** a Starter tier user chooses to include the watermark
- **THEN** the watermark is applied and 5 bonus credits are added to their monthly quota

#### Scenario: Starter tier watermark opt-out
- **WHEN** a Starter tier user chooses to exclude the watermark
- **THEN** no watermark is applied and no bonus credits are granted

---

### Requirement: SNS direct sharing
The system SHALL support direct video upload to TikTok (via TikTok for Business API) and Instagram (via Meta Graph API). Caption and hashtags from the copy generation MUST be auto-filled. YouTube Shorts direct sharing is deferred to Phase 2.

#### Scenario: TikTok direct upload
- **WHEN** a user connects their TikTok business account and clicks "TikTok에 공유"
- **THEN** the TikTok-optimized variant is uploaded with auto-filled caption and hashtags

#### Scenario: Instagram direct upload
- **WHEN** a user connects their Instagram business account and clicks "Instagram에 공유"
- **THEN** the Reels-optimized variant is uploaded with auto-filled caption and hashtags

#### Scenario: SNS account not connected
- **WHEN** a user clicks share but has not connected the target SNS account
- **THEN** the system shows an account connection flow with OAuth and offers "다운로드 후 직접 업로드" as alternative

#### Scenario: Upload failure
- **WHEN** SNS upload fails due to network error or API issue
- **THEN** the system retries once, then offers download as fallback with message "업로드에 실패했습니다. 다운로드 후 직접 업로드해주세요"

#### Scenario: Platform policy change
- **WHEN** a platform API changes its requirements
- **THEN** the download fallback is always available as a guaranteed alternative

---

### Requirement: Video regeneration from preview
The system SHALL allow video regeneration directly from the preview screen. "다른 스타일로 다시 만들기" MUST be prominently displayed. Each regeneration MUST use a different style or seed. The previous version MUST remain available until the user accepts the new version.

#### Scenario: Regenerate from preview
- **WHEN** a user clicks "다른 스타일로 다시 만들기" from the preview screen
- **THEN** a new generation starts with a different style while the current preview remains visible

#### Scenario: Accept new version
- **WHEN** a user previews the regenerated video and clicks "이 영상 사용하기"
- **THEN** the new version replaces the previous one as the active video

#### Scenario: Keep original version
- **WHEN** a user previews the regenerated video and clicks "이전 영상으로 돌아가기"
- **THEN** the original video remains as the active video and the regenerated version is discarded

