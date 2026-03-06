# image-analysis Specification

## Purpose
TBD - created by archiving change 1dragon-mvp-foundation. Update Purpose after archive.
## Requirements
### Requirement: Image upload with validation
The system SHALL accept product image uploads in JPEG, PNG, and WebP formats. Maximum file size MUST be 20MB. Minimum resolution MUST be 720x720px. The system MUST validate format, size, and resolution before processing. EXIF rotation data MUST be auto-corrected.

#### Scenario: Valid image upload
- **WHEN** a user uploads a 1200x1200px JPEG image under 20MB
- **THEN** the image is accepted, stored in S3, and an analysis job is queued

#### Scenario: Unsupported format rejection
- **WHEN** a user uploads a GIF or BMP file
- **THEN** the system returns HTTP 400 with message "지원하지 않는 이미지 형식입니다. JPEG, PNG, WebP 형식을 사용해주세요"

#### Scenario: File size exceeds limit
- **WHEN** a user uploads an image larger than 20MB
- **THEN** the system returns HTTP 413 with message "이미지가 너무 큽니다 (최대 20MB)" and suggests client-side compression

#### Scenario: Low resolution image
- **WHEN** a user uploads an image with resolution below 720x720px
- **THEN** the image is auto-upscaled via Real-ESRGAN before analysis with info message "더 좋은 사진으로 더 좋은 영상을 만들 수 있어요"

#### Scenario: EXIF rotation correction
- **WHEN** a user uploads a JPEG with EXIF orientation flag set to 6 (90° CW)
- **THEN** the image is rotated to correct orientation before analysis

---

### Requirement: AI image analysis with dual vision models
The system SHALL analyze uploaded product images using Claude Vision API as the primary analyzer. Gemini Vision MUST serve as the fallback analyzer. Analysis MUST extract: product_category (Enum), color_palette (top 5 hex colors), keywords (5 Korean keywords), mood (Enum: 모던/따뜻한/활기찬/고급스러운/캐주얼), recommended_styles (top 3 StyleIDs).

#### Scenario: Successful analysis with Claude Vision
- **WHEN** a valid product image is submitted for analysis
- **THEN** Claude Vision returns structured analysis data within 3 seconds including category, colors, keywords, mood, and recommended styles

#### Scenario: Claude Vision failure fallback to Gemini
- **WHEN** Claude Vision API returns a 5xx error or times out after 5 seconds
- **THEN** the system automatically retries with Gemini Vision and returns analysis results

#### Scenario: Non-product image detection
- **WHEN** the uploaded image is detected as a non-product image (landscape, person-only, text-only)
- **THEN** the system returns a warning "상품 사진을 올려주세요" and prompts re-upload without consuming a credit

#### Scenario: User-specified category override
- **WHEN** a user manually selects a product category before analysis
- **THEN** the user-selected category takes precedence over AI-detected category

#### Scenario: Multiple products detected
- **WHEN** the image contains multiple products
- **THEN** the system auto-detects the primary product and shows info "하나의 상품만 포함된 사진을 추천합니다"

---

### Requirement: Background removal
The system SHALL remove the background from product images using Remove.bg API. The output MUST be a transparent PNG foreground asset. If the image already has a transparent background, the removal step MUST be skipped.

#### Scenario: Successful background removal
- **WHEN** a product image with a non-transparent background is processed
- **THEN** Remove.bg returns a foreground-only image with transparent background within 2 seconds

#### Scenario: Already transparent background
- **WHEN** a product image with an existing transparent background is uploaded
- **THEN** the background removal step is skipped and the original image is used as-is

#### Scenario: Remove.bg failure fallback
- **WHEN** Remove.bg API fails or times out
- **THEN** the system proceeds with the original image (with background) and logs a warning for monitoring

---

### Requirement: Image upscaling for low-resolution inputs
The system SHALL auto-upscale images with resolution below 720px on either dimension using Real-ESRGAN (self-hosted). The upscaled image MUST meet the minimum 720x720px requirement.

#### Scenario: Auto-upscale trigger
- **WHEN** an uploaded image has width or height below 720px
- **THEN** Real-ESRGAN upscales the image to at least 720px on the shortest dimension

#### Scenario: Upscale quality verification
- **WHEN** Real-ESRGAN upscaling is completed
- **THEN** the output image maintains structural integrity without visible artifacts above acceptable threshold

---

### Requirement: Imagen-based image generation and variation
The system SHALL use Google Gemini Imagen API to generate product image variations, background scenes, and styled product compositions. Imagen MUST be available for: background scene generation (to replace removed backgrounds), product image style transfer, and model+product composite image generation (used by model-persona capability).

#### Scenario: Background scene generation
- **WHEN** the video generation pipeline needs a styled background for a product
- **THEN** Imagen generates a background scene matching the product mood and style preset

#### Scenario: Product style transfer
- **WHEN** a user selects "프리미엄" style and the product is a casual item
- **THEN** Imagen generates a premium-styled product composition with appropriate lighting and setting

#### Scenario: Imagen API failure
- **WHEN** Gemini Imagen API fails or is unavailable
- **THEN** the system falls back to using the original product image with AI-generated video backgrounds only

---

### Requirement: Analysis result persistence
The system SHALL persist all analysis results in the `product_analyses` table with foreign key to the user. Analysis results MUST include: original image URL, background-removed image URL, enhanced image URL (if upscaled), analysis metadata (category, colors, keywords, mood, styles), and processing timestamps.

#### Scenario: Analysis result storage
- **WHEN** image analysis completes successfully
- **THEN** all results are persisted in the database and the analysis ID is returned to the client

#### Scenario: Analysis result retrieval
- **WHEN** a user requests their analysis history
- **THEN** the system returns paginated analysis results ordered by creation date (newest first)

