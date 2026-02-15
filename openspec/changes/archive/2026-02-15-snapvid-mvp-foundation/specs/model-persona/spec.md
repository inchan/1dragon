## ADDED Requirements

### Requirement: Category-based model persona trigger
The system SHALL automatically detect whether the uploaded product belongs to a model-eligible category: 의류 (Clothing), 악세서리 (Accessories), 뷰티 (Beauty). When a model-eligible category is detected, the model persona selection UI MUST be automatically shown. For non-eligible categories (가전, 식품, 기타), the standard product-only video flow MUST proceed.

#### Scenario: Clothing category detected
- **WHEN** image analysis detects product_category as "의류/패션"
- **THEN** the model persona selection step is inserted into the generation flow with UI showing persona options

#### Scenario: Accessories category detected
- **WHEN** image analysis detects product_category as "악세서리"
- **THEN** the model persona selection step is shown

#### Scenario: Non-eligible category
- **WHEN** image analysis detects product_category as "가전" or "식품"
- **THEN** the model persona step is skipped and the standard product-only video flow proceeds

#### Scenario: User overrides category to eligible
- **WHEN** a user manually changes the product category from "기타" to "의류"
- **THEN** the model persona selection UI appears even though AI detected a different category

#### Scenario: User skips model selection
- **WHEN** the model persona selection is shown but the user clicks "모델 없이 만들기"
- **THEN** the standard product-only video flow proceeds without a model

---

### Requirement: Preset model persona selection
The system SHALL provide preset model personas defined by 4 attributes: Gender (여성/남성), Age Range (20대/30대/40대), Body Type (슬림/레귤러), Style (캐주얼/포멀/스트리트/미니멀). All 48 combinations (2×3×2×4) MUST be selectable. The system MUST auto-recommend 3 personas based on the product's target demographic analysis.

#### Scenario: View preset personas
- **WHEN** the model persona selection UI is displayed
- **THEN** the user sees attribute selectors for gender, age, body type, and style with 3 auto-recommended combinations highlighted

#### Scenario: Select recommended persona
- **WHEN** a user selects the first recommended persona (e.g., 여성/20대/슬림/캐주얼)
- **THEN** the selected persona parameters are passed to the image generation step

#### Scenario: Custom combination
- **WHEN** a user selects 남성/30대/레귤러/포멀 (a non-recommended combination)
- **THEN** the custom combination is accepted and passed to image generation

#### Scenario: Auto-recommendation logic
- **WHEN** the product is a women's casual dress
- **THEN** the top 3 recommendations are personas with 여성 gender, varied ages, and casual/미니멀 styles

---

### Requirement: Model+product composite image generation via Imagen
The system SHALL use Google Gemini Imagen API to generate composite images of the selected model persona wearing/using the product. Input MUST include: background-removed product image, persona attributes, and product category. Output MUST be a photorealistic image of the model with the product that can be used as I2V input.

#### Scenario: Successful composite generation
- **WHEN** a persona (여성/20대/슬림/캐주얼) is selected for a dress product
- **THEN** Gemini Imagen generates a photorealistic image of a matching model wearing the dress within 5 seconds

#### Scenario: Accessory product composite
- **WHEN** a persona is selected for a necklace product
- **THEN** Gemini Imagen generates an image of the model wearing the necklace with appropriate styling

#### Scenario: Beauty product composite
- **WHEN** a persona is selected for a lipstick product
- **THEN** Gemini Imagen generates an image of the model using/showcasing the beauty product

---

### Requirement: Model composite quality validation
The system SHALL validate the quality of generated model+product composite images. Validation MUST check: (1) product visibility and recognizability, (2) natural integration of product with model, (3) absence of obvious artifacts. If quality score < 60%, the system MUST auto-regenerate with adjusted prompt (max 2 retries).

#### Scenario: Quality validation pass
- **WHEN** the composite image has product visibility score ≥ 60% and no major artifacts
- **THEN** the image is accepted and forwarded to the I2V pipeline

#### Scenario: Quality validation fail with retry
- **WHEN** the composite image has quality score < 60% and retry count < 2
- **THEN** the system regenerates with an adjusted prompt (e.g., different pose, angle, or lighting)

#### Scenario: Quality validation fail after max retries
- **WHEN** quality validation fails after 2 retries
- **THEN** the system falls back to product-only video generation with message "모델 합성에 실패했습니다. 상품 중심 영상으로 진행합니다" and offers retry option

---

### Requirement: Composite image to I2V pipeline integration
The system SHALL use the model+product composite image as the primary input for the I2V generation step, replacing the standard background-removed product image. The rest of the video generation pipeline (style selection, I2V, FFmpeg composition) MUST proceed identically. The composite image MUST be treated as a drop-in replacement for the foreground asset.

#### Scenario: Model persona pipeline flow
- **WHEN** a model persona is selected and composite image is generated
- **THEN** the composite image enters the I2V pipeline as the primary image input (instead of product-only foreground)

#### Scenario: Pipeline compatibility
- **WHEN** the composite image is used as I2V input
- **THEN** all downstream steps (style application, clip generation, FFmpeg composition, variant rendering) work identically to the product-only flow

---

### Requirement: Persona preset data management
The system SHALL store model persona presets in the `model_persona_presets` table. Each preset MUST include: gender, age_range, body_type, style, Imagen prompt template, and display metadata (name, thumbnail). The prompt template MUST be parameterizable with product attributes.

#### Scenario: Preset data seeding
- **WHEN** the system initializes
- **THEN** all 48 preset combinations are seeded in the database with appropriate prompt templates

#### Scenario: Prompt template interpolation
- **WHEN** a user selects 여성/20대/슬림/캐주얼 for a "플로럴 원피스" product
- **THEN** the Imagen prompt template is interpolated with persona attributes and product keywords to produce a specific generation prompt

---

### Requirement: Model persona selection persistence
The system SHALL persist the user's model persona selection per video generation in the `model_persona_selections` table. This MUST link to the video_job and store the selected preset_id, composite image URL, and quality score.

#### Scenario: Selection persistence
- **WHEN** a user generates a video with a model persona
- **THEN** the selection (preset_id, composite_image_url, quality_score) is recorded and associated with the video job

#### Scenario: History with persona info
- **WHEN** a user views their video generation history
- **THEN** videos with model personas show the persona type used (e.g., "여성/20대/캐주얼 모델")
