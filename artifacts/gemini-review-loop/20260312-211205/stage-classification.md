# Stage Classification

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
