## ADDED Requirements

### Requirement: Wearer-first opening validation

The system SHALL validate whether the opening frame of a short-form ad candidate contains a visible wearer when the review mode requires a wearer-first ad. A product-only or mannequin-only opening MUST be treated as a blocking failure for wearer-first fashion ads.

#### Scenario: Product-only opening fails wearer-first ad review

- **WHEN** the first sampled frame shows only the product or mannequin without a visible wearer
- **AND** wearer-first opening is required
- **THEN** the review output SHALL mark the candidate as blocked with an explicit opening-frame failure

#### Scenario: Wearer-first opening passes

- **WHEN** the first sampled frame shows a visible wearer in the product
- **THEN** the opening-frame requirement SHALL be marked as satisfied

### Requirement: CTA delivery mode in review

The system SHALL support review-time CTA delivery modes. When CTA mode is `in-video`, the review MUST require a visible CTA in the generated frames. When CTA mode is `external-overlay`, the candidate MAY pass without visible in-video CTA text if the other ad checks are satisfied.

#### Scenario: External overlay CTA does not block otherwise-good ad

- **WHEN** the review is configured with CTA mode `external-overlay`
- **AND** the candidate satisfies human presence, active demonstration, story, message, and product-truth checks
- **THEN** missing in-video CTA text SHALL NOT be treated as a blocking failure

#### Scenario: In-video CTA remains strict

- **WHEN** the review is configured with CTA mode `in-video`
- **AND** the expected CTA is not visible in the candidate
- **THEN** the candidate SHALL fail with an explicit CTA blocking failure
