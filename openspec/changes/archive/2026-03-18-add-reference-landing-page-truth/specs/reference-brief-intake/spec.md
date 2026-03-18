## MODIFIED Requirements

### Requirement: The system SHALL normalize reference briefs into collection-ready hints
The system SHALL trim, deduplicate, and bucket the brief into stable query-hint groups that later collection and ranking steps can reuse.

For landing-page inputs, normalization SHALL also preserve provenance and best-effort extracted truth:
- `landingPageSource`: `provided_text` | `fetched_url` | `url_only`
- `landingPageTitle` when available
- `landingPageDescription` when available
- `landingPageExcerpt` from provided or fetched page text when available

#### Scenario: URL-only brief is enriched from fetched html
- **WHEN** a valid `referenceBrief` includes `landingPageUrl` but omits `landingPageText`
- **THEN** the system SHALL best-effort fetch the page, extract title/description/readable text, and include any extracted signals in the normalized brief

#### Scenario: Landing-page fetch fails open
- **WHEN** a valid `referenceBrief` includes `landingPageUrl` but the remote page times out, fails, or is not HTML
- **THEN** the request SHALL still succeed and the normalized brief SHALL record `landingPageSource = url_only`
