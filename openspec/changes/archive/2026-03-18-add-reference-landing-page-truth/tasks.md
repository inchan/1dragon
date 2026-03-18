## 1. Landing-Page Resolution

- [x] 1.1 Add a best-effort landing-page truth resolver that fetches and extracts title, description, and readable text
- [x] 1.2 Add unit tests for successful HTML extraction and safe fallback on fetch failure

## 2. Normalized Brief Enrichment

- [x] 2.1 Extend `normalizedReferenceBrief` with landing-page provenance and extracted metadata
- [x] 2.2 Update `normalizeReferenceBriefInput` to consume resolved landing-page truth
- [x] 2.3 Update tests to prove provided text and fetched URL paths are both represented correctly

## 3. Route Integration

- [x] 3.1 Resolve landing-page truth during job submission when `referenceBrief` is present
- [x] 3.2 Add a route test proving URL-only input enriches the normalized queue payload without failing the request
