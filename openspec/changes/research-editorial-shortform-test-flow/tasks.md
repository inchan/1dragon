## 1. Planning Contract

- [x] 1.1 Extend the short-form fashion story brief schema with message-spine, proof-line, viewer-takeaway, editorial-thesis, and talent-direction fields
- [x] 1.2 Extend fashion shot cards with palette, framing, blocking, gaze, silhouette-hero-zone, hierarchy, and overlay-safe-zone fields
- [x] 1.3 Add planner validation that rejects multi-claim or motion-only fashion briefs before prompt compilation
- [x] 1.4 Define a photo-conditioned storyline schema that separates image diagnosis, storyline type, message spine, and 16-second beat plan
- [x] 1.5 Add a deterministic product-signal taxonomy matcher that classifies fashion inputs into diagnosis fields and scores approved storyline types
- [x] 1.6 Wire the runtime story planner to select the highest-fit photo-conditioned storyline while preserving concept-family compatibility for existing API/web flows
- [x] 1.7 Persist selected storyline-type traces and compact diagnosis summaries into job metadata/history surfaces
- [x] 1.8 Add an approved reference-shelf retrieval step that selects structure cues by storyline fit and product diagnosis
- [x] 1.9 Add a storyline-element planning layer that separates background, motion, camera, proof, payoff, and motion-energy class
- [x] 1.10 Assemble runtime storyline elements from product diagnosis, selected concept, and approved reference seeds before shot planning
- [x] 1.11 Add scenario-wrapper, place-frame, action-frame, moment-frame, and proof-goal fields to photo-conditioned storyline planning and derived outputs

## 2. Prompt Restructuring

- [x] 2.1 Replace the current prose-only composite brief with a structured talent brief plus an explicit avoid list
- [x] 2.2 Replace the current generic video prompt defaults with shot-role-driven prompts tied to message spine and editorial brief fields
- [x] 2.3 Persist separate composite, video, and review prompt artifacts in the short-form test flow
- [x] 2.4 Add a structured AI prompt template that asks for photo-conditioned storyline candidates instead of freeform story generation
- [x] 2.5 Propagate selected storyline-type traces into prompt debug output without breaking current concept-family metadata contracts
- [x] 2.6 Surface storyline-type and diagnosis traces in studio/dashboard UI so operators can inspect why a job took a given story path
- [x] 2.7 Feed approved reference cues into prompt compilation and the live shortform tooling bridge so after-runs can be reference-conditioned
- [x] 2.8 Propagate storyline elements, distinctiveness cues, and anti-generic guardrails into prompt compilation/debug output
- [x] 2.9 Add anti-mannequin / anti-generic motion language so prompts do not regress into safe catalog sway
- [x] 2.10 Auto-apply selected photo-conditioned storyline outputs to the Gemini shortform test flow so composite/video prompts inherit scenario directives

## 3. Review Gates And Scoring

- [x] 3.1 Add the editorial visual rubric to the review loop with per-dimension notes
- [x] 3.2 Add the talent-direction pass/fail check and stock-model failure reasons
- [x] 3.3 Reweight the scorecard to message legibility, editorial execution, talent direction, and product truth with hard-fail checks
- [x] 3.4 Fix external-overlay review normalization so healthy `no in-video CTA` notes do not become false contamination failures

## 4. Calibration And Rollout

- [ ] 4.1 Judge a sample set of short fashion outputs and tune pass, revise, and fail thresholds
- [x] 4.2 Update operator docs and run summaries to output `do_now`, `do_later`, and `not_yet` recommendations
- [ ] 4.3 Decide the PM default message-spine set and whether Korean editorial talent is a global or preset-only default
- [x] 4.4 Define a multi-source reference and prompt collection strategy with explicit source priority, rights boundaries, and verification rules
- [x] 4.5 Define a normalized reference-entry schema that can store structure, prompt recipes, planner-fit tags, and approval state across all collection lanes
- [x] 4.6 Define a phased ingestion pipeline and bootstrap quota for official SNS, official platform prompt surfaces, internal judged runs, licensed creator assets, and signal-mined angles
- [x] 4.7 Create a stage-by-stage distinctive-shortform loop session with per-stage research and a 30-loop improvement map
- [ ] 4.8 Replay the detail-first overlay-safe recipe across at least two additional garment diagnoses before promoting it as a stable control
