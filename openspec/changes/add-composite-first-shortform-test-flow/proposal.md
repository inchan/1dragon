# Proposal: add-composite-first-shortform-test-flow

## Why

The current direct Gemini test flow sends a product-only image into Veo and asks prompt instructions to turn it into a wearable short-form ad. In practice, the first frame often stays product-only, the transition into a person is visibly unnatural, and repeated runs converge toward the same default fashion-model archetype. This makes the test flow poor at validating the actual product goal: short-form ecommerce ads that start with a believable wearer, prove fit/movement, and leave room for a conversion CTA.

Official Gemini guidance points in the same direction:
- Veo image-to-video follows the input image closely, and reference images / first-last frame controls are the intended way to steer identity and shot structure.
- Gemini image generation supports text-and-image-to-image editing, which is a better fit for generating a wearer-first composite from a product-only source image.
- Short-form platform guidance emphasizes using real creative patterns as inspiration, not copying specific ads.

## What Changes

- Add a provider-backed composite-image smoke path that takes a product image and generates a wearer-first model composite image before video generation.
- Add a chained short-form ad test flow that runs `product image -> composite image -> 8-second Veo video -> Gemini ad review`.
- Tighten the review loop with opening-frame checks so product-only openings fail when ad mode requires a wearer from frame one.
- Add an explicit CTA mode for `in-video` vs `external-overlay` so the review gate matches how the ad will actually ship.

## Impact

- Operators can test the architecture that is closer to the real ad goal instead of relying on prompt-only morphing from a product-only first frame.
- Review artifacts become stricter about the opening shot, which should prevent visually unnatural but technically valid candidates from being treated as wins.
- The short-form test flow remains direct-provider based, so it can be exercised without the full API worker stack.
