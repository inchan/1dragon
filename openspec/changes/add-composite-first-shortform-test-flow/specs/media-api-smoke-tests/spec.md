## ADDED Requirements

### Requirement: Composite-first short-form smoke flow

The system SHALL provide a direct-provider short-form smoke flow for fashion ads that generates a wearer-first composite image from a product-only source image before generating the video candidate. The flow SHALL use the composite image as the primary Veo input and SHALL default the Veo duration to 8 seconds for this path.

#### Scenario: Product image becomes composite-first Veo input

- **WHEN** an operator runs the short-form smoke flow with a fashion product image
- **THEN** the system first generates a wearer-first composite image through a provider-backed image generation/editing step
- **AND** the resulting composite image is used as the Veo image input
- **AND** the saved artifact set contains the product image, composite image, Veo request, Veo output, and provider responses

#### Scenario: Composite artifact is reusable

- **WHEN** the composite generation step succeeds
- **THEN** the composite image SHALL be persisted as a standalone artifact that can be inspected or reused in follow-up review and generation steps

