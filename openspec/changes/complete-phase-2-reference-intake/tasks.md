## 1. Taxonomy Enrichment

- [x] 1.1 Add shared schema fields for `productAnalysisId`, stable taxonomy, and persisted `referenceIntake`
- [x] 1.2 Add a product-analysis-backed taxonomy helper for category and usage-context enrichment
- [x] 1.3 Update reference-brief normalization tests to cover `brief_only`, `product_analysis`, and merged taxonomy paths

## 2. Intake Persistence

- [x] 2.1 Extend `video_jobs` persistence with a JSONB `reference_intake` payload and repository mapping
- [x] 2.2 Add a migration and repository tests covering persisted intake payloads

## 3. Media Endpoint Integration

- [x] 3.1 Accept optional `productAnalysisId` on job creation and validate ownership before enqueue
- [x] 3.2 Persist the intake bundle during job creation and pass enriched normalized brief/productAnalysisId into the queue payload
- [x] 3.3 Expose persisted `referenceIntake` on job detail responses and add route tests for success and invalid analysis references
