# Reference Collection Strategy

> **Canonical policy note (2026-03-18)**
> This file is now the primary intake-policy document for the reference-first pivot.
> It defines what the system is allowed to collect, normalize, approve, and retrieve before any downstream creative generation or validation step.

## Goal

Build a sustainable reference library that helps the system and operator choose the best storyline structure for a given product brief without copying external creatives.

The system should learn:

- `story structure` from short-form winners
- `prompt recipe patterns` from official creation and platform guidance surfaces
- `truth` from our own judged outputs

The system should not:

- copy creator videos, captions, edits, or music
- treat scraped public videos as reusable creative assets
- let freeform prompting bypass the taxonomy-based planner

## Decision Summary

Use a five-lane portfolio instead of a single source.

1. `Official SNS structure lane`
   - TikTok Creative Center / Top Ads / Spotlight
   - Meta Ad Library / Reels ads references
   - YouTube Shorts official creator guidance and success cases
2. `Official platform prompt lane`
   - Runway prompt guides and prompt libraries
   - Sora feed / remixable public examples / official prompt tips
   - Veo prompt gallery / best-practice docs
   - Hailuo or MiniMax official docs only, unless we later secure a stable approved corpus
3. `Internal judged lane`
   - our saved runs, prompts, artifacts, reviews, and human verdicts
4. `Licensed creator lane`
   - Spark Ads, Meta partnership ads, or directly licensed creator assets
5. `Signal mining lane`
   - PDP hero claims, reviews, Q&A, return reasons, Google Trends, caption keyword trends

## Dual Priority Model

Use two priority lists so acquisition urgency is not confused with truth quality.

### Bootstrap Collection Priority

1. `Official SNS structure lane`
2. `Official platform prompt lane`
3. `Internal judged lane`
4. `Signal mining lane`
5. `Licensed creator lane`

### Truth Priority For Planner Decisions

1. `Internal judged lane`
2. `Licensed creator lane`
3. `Official SNS structure lane`
4. `Official platform prompt lane`
5. `Signal mining lane`

Why:

- external sources are best for fast bootstrap
- internal judged outputs are the most trustworthy source for what actually works in our own stack

## Source Priority Table

| Lane | What To Extract | Rights Position | Strength | Weakness | Initial Quota | Refresh |
| --- | --- | --- | --- | --- | --- | --- |
| Official SNS structure | hook, proof, payoff, shot order, text density, first-second trigger | structure only, not raw reuse | native short-form grammar | limited prompt visibility | 15 references | weekly |
| Official platform prompt | prompt recipes, prompt sections, motion/camera wording, negative constraints | doc/library usage | best prompt surface | may not map directly to fashion ecommerce | 10 references | monthly |
| Internal judged | diagnosis, storyline type, prompt, output, review, human verdict | first-party | highest truth value | slow to bootstrap | 10 references | every run batch |
| Licensed creator | structure, approved examples, archetype tags | approved reuse only | high quality and safer reuse | slower and higher operational cost | 3 references | ad hoc |
| Signal mining | hero claims, problems, objections, use cases, keywords | derived metadata | durable angle source | weak visual grammar | 10 signals | weekly |

## Normalized Reference Entry Schema

The normalized record must let one item answer three questions:

1. `What is this reference saying?`
2. `Why does it fit a product image or product diagnosis?`
3. `How can the planner borrow the structure without copying the expression?`

Canonical files:

- JSON schema: [reference-entry.schema.json](/Users/inchan/workspace/1dragon/.planning/reference-library/reference-entry.schema.json)
- CSV header template: [reference-entry.csv](/Users/inchan/workspace/1dragon/.planning/reference-library/reference-entry.csv)

### Required Field Groups

- `identity`
  - `reference_id`
  - `source_lane`
  - `source_platform`
  - `source_url`
  - `captured_at`
- `rights`
  - `rights_status`
  - `reuse_allowed`
  - `notes`
- `creative_structure`
  - `hook_type`
  - `one_claim`
  - `proof_type`
  - `payoff_type`
  - `cta_mode`
  - `text_dependency`
  - `audio_dependency`
  - `target_duration_seconds`
- `visual_grammar`
  - `shot_pattern`
  - `camera_energy`
  - `transition_density`
  - `product_visibility`
  - `overlay_usage`
- `planner_fit`
  - `storyline_type`
  - `message_spine`
  - `best_for_signals`
  - `bad_fit_signals`
  - `must_show`
  - `must_avoid`
- `prompt_recipe`
  - `prompt_surface_type`
  - `prompt_sections`
  - `negative_constraints`
  - `provider_specific_notes`
- `evidence`
  - `peak_frame_description`
  - `structure_notes`
  - `operator_notes`
- `quality`
  - `reference_quality`
  - `verification_status`
  - `approved_for_planner`

## CSV Header

The CSV is the low-friction intake surface for manual collection.

```csv
reference_id,source_lane,source_platform,source_url,captured_at,rights_status,reuse_allowed,hook_type,one_claim,proof_type,payoff_type,cta_mode,text_dependency,audio_dependency,target_duration_seconds,shot_pattern,camera_energy,transition_density,product_visibility,overlay_usage,storyline_type,message_spine,best_for_signals,bad_fit_signals,must_show,must_avoid,prompt_surface_type,prompt_sections,negative_constraints,provider_specific_notes,peak_frame_description,structure_notes,operator_notes,reference_quality,verification_status,approved_for_planner
```

## Ingestion Pipeline

The intake flow should be deterministic and auditable.

1. `Discover`
   - choose candidate references from a single lane
   - store source URL and capture timestamp
2. `Capture`
   - save a small metadata record and one representative frame description
   - do not save copyrighted media unless first-party or explicitly licensed
3. `Normalize`
   - map the item into the normalized reference entry schema
4. `Enrich`
   - add taxonomy tags such as `storyline_type`, `message_spine`, `best_for_signals`, `must_show`, `must_avoid`
5. `Verify`
   - confirm rights status
   - confirm single-claim structure
   - confirm required fields are present
   - confirm the item teaches structure or prompt craft, not only style
6. `Approve`
   - mark `approved_for_planner=true` only when an operator or reviewer signs off
7. `Retrieve`
   - at planning time, retrieve references by product diagnosis, storyline fit, proof fit, and text-dependency compatibility

## Verification Gate

No reference should enter planner retrieval until it passes all checks below.

### Required checks

- `rights clear`
  - structure-only, first-party, or licensed
- `single claim`
  - one clear claim, not a generic mood reel
- `taxonomy fit`
  - can be mapped to one approved storyline type
- `evidence density`
  - contains enough structure notes to teach the planner something useful
- `operator utility`
  - a human can explain why this reference would or would not fit a product image

### Reject conditions

- raw creative is copied instead of abstracted
- the source depends mainly on copyrighted audio or creator identity
- the item uses multi-claim storytelling with no dominant proof path
- the item looks appealing but cannot be mapped to `hook -> proof -> payoff`

## Retrieval Rules For The Planner

Use references as conditioned examples, not as templates to clone.

The future planner or ranking retrieval input should include:

- `visible_garment_type`
- `primary_visual_claim`
- `hero_detail`
- `silhouette_read`
- `proof_focus`
- `versatility_signal`
- `visual_risks`
- `storyline_type`
- `message_spine`
- `cta_mode`

The retrieval score should emphasize:

1. diagnosis fit
2. storyline type fit
3. proof type fit
4. low text dependency for `external-overlay`
5. approval and judged quality

## First Bootstrap Set

Start small and balanced.

- `15` official SNS structure references
- `10` official platform prompt references
- `10` internal judged references
- `10` signal entries from PDP/reviews/trends
- `3` licensed creator references when available

The first approved shelf should cover:

- `QUESTION_PROOF_PAYOFF`
- `DETAIL_TO_SILHOUETTE_REVEAL`
- `PROBLEM_SOLUTION_TRYON`

Do not bootstrap the weaker storyline families first.

## Phased Execution

### Phase A. Manual intake

- populate CSV rows manually
- validate against the JSON schema
- keep approval human-only

### Phase B. Semi-automated enrichment

- add scripts that convert intake CSV into normalized JSON
- attach planner taxonomy tags
- compute retrieval scores

### Phase C. Retrieval-assisted planning

- planner pulls top references by diagnosis and storyline fit
- prompt builder receives distilled structure notes and avoid lists, not raw copied copy

## What To Ignore

- community prompt dumps with unclear provenance
- creator videos without reuse authorization
- samples whose value comes mostly from sound design or celebrity recognition
- aesthetic moodboards that do not teach a proof path
