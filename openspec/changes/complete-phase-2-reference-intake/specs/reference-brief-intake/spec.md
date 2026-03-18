## MODIFIED Requirements

### Requirement: The system SHALL normalize reference briefs into collection-ready hints
The system SHALL trim, deduplicate, and bucket the brief into stable query-hint groups that later collection and ranking steps can reuse.

The normalized output SHALL also preserve stable taxonomy when product-analysis evidence is available:
- optional `productAnalysisId`
- `taxonomy.category` using the shared product-category enum
- `taxonomy.usageContexts` using a bounded usage-context set
- `taxonomy.source` indicating whether the taxonomy came from the brief, product analysis, or both

#### Scenario: Product analysis enriches category taxonomy
- **WHEN** a valid media job request includes both `referenceBrief` and a valid `productAnalysisId`
- **THEN** the normalized brief SHALL include taxonomy derived from the referenced product analysis plus any compatible brief signals

#### Scenario: Brief-only requests still normalize without product analysis
- **WHEN** a valid media job request includes `referenceBrief` but omits `productAnalysisId`
- **THEN** normalization SHALL still succeed and SHALL derive taxonomy from the brief-only path
