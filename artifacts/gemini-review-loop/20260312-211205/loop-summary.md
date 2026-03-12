# Gemini Video Review Loop

- iterations: 5
- source image: /Users/inchan/workspace/1dragon/artifacts/gemini-review-loop/20260312-211205/source-image.png
- run manifest: /Users/inchan/workspace/1dragon/artifacts/gemini-review-loop/20260312-211205/run-manifest.json
- stage classification: /Users/inchan/workspace/1dragon/artifacts/gemini-review-loop/20260312-211205/stage-classification.json
- best iteration: iter-04
- best video: /Users/inchan/workspace/1dragon/apps/api/scripts/output/fashion-001-veo-seongsu-highmodel-2026-02-20T18-09-17.mp4
- best verdict: pass
- best combined score: 91.7

## Ranking
- iter-04: verdict=pass, combined=91.7, avgGemini=8.17, technical=True
- iter-03: verdict=revise, combined=81.7, avgGemini=7.17, technical=True
- iter-05: verdict=revise, combined=68.3, avgGemini=5.83, technical=True
- iter-02: verdict=revise, combined=60.0, avgGemini=5.0, technical=True
- iter-01: verdict=revise, combined=51.7, avgGemini=4.17, technical=True

## Common Weaknesses
- Could benefit from more dynamic poses or styling to enhance engagement. (1)
- Limited scene diversity with the model remaining static for a significant portion of the video. (1)
- No call to action or clear closing point is evident in the sampled frames. (1)
- No explicit call to action or strong closing point is evident in the sampled frames. (1)
- Overall visual quality is diminished by the unprofessional placeholder text. (1)
- The call to action (CTA) or closing point, while present with text overlays, might not be universally clear without translation. (1)
- The narrative progression is basic, primarily showing the product and then the model turning, without a clear story or proof beat. (1)
- The narrative progression is very basic, lacking a compelling story or proof beat. (1)
- The opening frame is a static shot of the dress, lacking an immediate hook or motion. (1)
- The opening hook is weak, featuring a static pose with no immediate engagement. (1)

## Stage Classification
- video-review-loop: direct-provider - This run validates local media files through validate-media, ffmpeg, and Gemini directly.
- products-analyze-api: stubbed - The current products/analyze path uses stub-backed vision adapters and cannot be claimed as live provider-backed analysis.
- media-jobs-api: blocked - Missing prerequisites: SESSION_COOKIE; Unreachable services: DATABASE_URL@localhost:5432, REDIS_URL@localhost:6379, S3_ENDPOINT@localhost:9000
- model-composite-api: blocked - This path still depends on auth, DB runtime, and valid preset IDs; it is not exercised by the direct-provider loop.

## Missing Full-Stack Prerequisites
- SESSION_COOKIE

## Unreachable Services
- DATABASE_URL: localhost:5432
- REDIS_URL: localhost:6379
- S3_ENDPOINT: localhost:9000

## Best Candidate Guidance
- strength: The product in the video is an excellent match to the source image, ensuring product truth.
- strength: The opening frame immediately engages the viewer with a model walking, implying motion and interest.
- strength: Visual quality, composition, and realism are high, making for a professional-looking ad.
- strength: The video clearly tells a story of showcasing an outfit of the day (OOTD).
- next: To broaden appeal, consider adding universal icons or translated text for the call to action.
- next: Explore incorporating additional diverse settings or dynamic camera movements to further enrich scene diversity.
