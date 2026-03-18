# Roadmap: 1Dragon

## Overview

1Dragon is resetting from "make the video first" to "decompose the brief first." The next milestone turns the repo into a reference-first system that collects product facts, market language, platform grammar, and official ad references, then converts those inputs into explainable storyline recommendations before any downstream creative production.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): planned milestone work
- Decimal phases (2.1, 2.2): urgent insertions when needed

- [x] **Phase 1: Reset Product Source of Truth** - realign project docs, workflow policy, and active scope around the reference-first pivot
- [ ] **Phase 2: Build Input And Fact Normalization** - turn images, product facts, and landing-page truth into structured intake records
- [ ] **Phase 3: Collect Reference Signals Safely** - prioritize official reference surfaces and rights-safe metadata capture
- [ ] **Phase 4: Extract Patterns And Rank Storylines** - convert collected references into reusable structures and scored storyline options
- [ ] **Phase 5: Deliver Operator Brief Workspace** - expose ranked angles, reference shelves, and approval-ready brief outputs
- [ ] **Phase 6: Resume Downstream Creative Validation** - reconnect storyboard/video validation only after the upstream workflow is trustworthy

## Phase Details

### Phase 1: Reset Product Source of Truth
**Goal**: Project docs and execution policy describe the reference-first product clearly enough that GSD and future tracker work can operate on one durable definition.
**Depends on**: Nothing (first phase)
**Requirements**: [REQ-01, REQ-02, REQ-03]
**Success Criteria** (what must be TRUE):
  1. `.planning/PROJECT.md`, `.planning/ROADMAP.md`, and `.planning/STATE.md` describe the reference-first goal and are internally consistent.
  2. `gsd-tools roadmap analyze` detects the roadmap phases and returns a non-empty phase list.
  3. Top-level contributor docs point operators to brief decomposition, reference capture, and storyline ranking before generation.
**Plans**: 2 plans

Plans:
- [x] 01-01: Rebuild GSD source-of-truth docs for the reference-first pivot
- [x] 01-02: Align top-level product docs and workflow policy with the new operating model

### Phase 2: Build Input And Fact Normalization
**Goal**: Operators can submit product assets and brief facts, and the system persists a normalized intake record that becomes the source of truth for later ranking.
**Depends on**: Phase 1
**Requirements**: [REQ-04, REQ-05, REQ-06]
**Success Criteria** (what must be TRUE):
  1. A product brief can include product name, price band, benefits, target, URL, and source images in one structured record.
  2. Product/image analysis and landing-page extraction produce a stable category and usage taxonomy.
  3. The normalized intake record can be reused by downstream collection and ranking steps without freeform reinterpretation.
**Plans**: 3 plans

Plans:
- [x] 02-01: Define the reference-first intake schema and validation rules
- [ ] 02-02: Add product/image and landing-page truth extraction
- [ ] 02-03: Persist normalized brief records and expose debug traces

Status note: landing-page truth extraction is implemented; the remaining `02-02` gap is stable category and usage taxonomy enrichment from product/image analysis.

### Phase 3: Collect Reference Signals Safely
**Goal**: The system gathers official reference signals and market-language inputs without depending on infringing media capture.
**Depends on**: Phase 2
**Requirements**: [REQ-07, REQ-08, REQ-09]
**Success Criteria** (what must be TRUE):
  1. Official reference sources can be queried by category, platform, or keyword intent.
  2. Each captured item records source lane, rights state, freshness, and retrieval metadata.
  3. The collection flow prefers structure and metadata over raw creative reuse.
**Plans**: 3 plans

Plans:
- [ ] 03-01: Add official-source collection adapters and query planning rules
- [ ] 03-02: Normalize rights state, source metadata, and capture evidence
- [ ] 03-03: Add market-language and trend-signal enrichment

Status note: initial query-planning rules and official-source discovery targets are implemented from persisted intake; the remaining `03-01` gap is live adapter execution against those targets.

### Phase 4: Extract Patterns And Rank Storylines
**Goal**: Collected inputs become reusable pattern records and ranked storyline candidates for the operator.
**Depends on**: Phase 3
**Requirements**: [REQ-10, REQ-11, REQ-12]
**Success Criteria** (what must be TRUE):
  1. References are stored as pattern units such as hook type, proof path, edit rhythm, and CTA placement.
  2. Storyline generation produces multiple angle candidates instead of one monolithic answer.
  3. Ranking combines product fit, platform fit, freshness, quality, and rights-risk penalties.
**Plans**: 3 plans

Plans:
- [ ] 04-01: Define pattern-extraction schema and validation gates
- [ ] 04-02: Generate multi-angle storyline candidates from normalized inputs
- [ ] 04-03: Add ranking logic with explicit scoring factors and evidence

### Phase 5: Deliver Operator Brief Workspace
**Goal**: Operators can inspect, compare, approve, and export the ranked storyline outputs without leaving the product.
**Depends on**: Phase 4
**Requirements**: [REQ-13, REQ-14]
**Success Criteria** (what must be TRUE):
  1. A user can review ranked storyline candidates, reference rationale, and version variants in one workspace.
  2. The workspace exposes why a candidate ranked well or poorly.
  3. Operators can promote approved references and angle sheets into a reusable shelf.
**Plans**: 2 plans

Plans:
- [ ] 05-01: Design the operator brief workspace and evidence surfaces
- [ ] 05-02: Add approval, reference-shelf, and export actions

### Phase 6: Resume Downstream Creative Validation
**Goal**: Only after the upstream system is trusted, reconnect legacy storyboard/video validation flows as downstream consumers of approved briefs.
**Depends on**: Phase 5
**Requirements**: [REQ-15, REQ-16]
**Success Criteria** (what must be TRUE):
  1. Downstream generation consumes approved storyline briefs instead of bypassing the ranking system.
  2. Legacy shortform/video validation is framed as optional validation, not the primary product entrypoint.
  3. Any resumed generation workflow keeps the reference-first evidence bundle attached to each run.
**Plans**: 2 plans

Plans:
- [ ] 06-01: Define the handoff contract from approved brief to downstream generation/validation
- [ ] 06-02: Re-scope legacy shortform changes against the new upstream contract

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Reset Product Source of Truth | 2/2 | Completed | 2026-03-18 |
| 2. Build Input And Fact Normalization | 1/3 | In progress | - |
| 3. Collect Reference Signals Safely | 0/3 | Not started | - |
| 4. Extract Patterns And Rank Storylines | 0/3 | Not started | - |
| 5. Deliver Operator Brief Workspace | 0/2 | Not started | - |
| 6. Resume Downstream Creative Validation | 0/2 | Not started | - |
