# Design: add-composite-first-shortform-test-flow

## Summary

The new test flow should stop using a product-only image as the direct Veo anchor for fashion ads. Instead, the flow should first generate a wearer-first composite image via Gemini image editing, then send that composite image to Veo for the 8-second ad candidate, and finally review the output with ad-focused gates that can distinguish between in-video CTA and post-production CTA overlay.

## Research Findings

### 1. Prompt-only is not enough for product-only image-to-video

Observed outputs show the first frame is still the original dress-only image, followed by a morph into a model. This is consistent with Veo using the input image as the initial anchor. The problem is not only weak prompting; the input structure itself makes a product-only opening likely.

### 2. Composite-first matches official capabilities better

Gemini image generation supports text-and-image-to-image editing, which is a better fit for turning a product-only asset into a believable wearer-first composite while preserving product identity. This gives Veo a better opening frame than asking it to invent both the model and the transition at once.

### 3. CTA should be modeled as a delivery mode, not only as a hardcoded visible frame requirement

When the generated video is intended to receive a post-production CTA overlay, failing the candidate for missing in-video text is counterproductive. The review loop needs a CTA mode that makes the rule explicit.

## Decisions

### Decision 1: Add a dedicated composite smoke script

- Create a direct-provider script that calls Gemini image generation with:
  - a product source image
  - a persona / shot brief
  - image output parsing
- Persist prompt, raw provider response, and generated composite image in the same artifact style as other smoke scripts.

Why:
- It provides a provider-backed wearer-first input without requiring the full app runtime.
- It is more aligned with the real short-form goal than prompting Veo to morph directly from product-only to wearer-first.

### Decision 2: Add a chained short-form ad flow script

- Create a script that:
  - generates a composite image
  - feeds that composite image to Veo for an 8-second video
  - optionally runs the Gemini ad review loop
- The flow should default to `cta-mode external-overlay` for fashion ad tests, because generated in-video text is currently less reliable than post-processing overlay.

Why:
- It turns the real test hypothesis into one command.
- It separates architecture quality from manual operator chaining.

### Decision 3: Tighten the review loop with opening-frame ad gates

- Add explicit opening-shot checks:
  - `opening_has_wearer`
  - `opening_is_product_only` must be false when wearer-first mode is required
- Sample the true opening frame in addition to later frames.
- Add `--cta-mode in-video|external-overlay`.

Why:
- Current human-presence checks can pass even if the opening is still a mannequin or dress-only shot.
- CTA evaluation must reflect delivery mode.

## Non-Goals

- Replacing the full application’s model-persona architecture in this change.
- Implementing full TikTok/Shorts post-production composition.
- Solving long-horizon persona diversity for all future runs.

## Verification Plan

- `pnpm --filter @1dragon/api typecheck:scripts`
- `pnpm --filter @1dragon/api smoke:gemini:composite -- --help`
- `pnpm --filter @1dragon/api smoke:gemini:shortform -- --help`
- `pnpm media:review:gemini -- --help`
- One live chained run:
  - product image -> composite image
  - composite image -> 8-second Veo video
  - review with `cta-mode external-overlay`
- Confirm:
  - opening frame contains a wearer
  - no product-only opening failure
  - technical validation passes
  - bestQualified is populated under external CTA mode
