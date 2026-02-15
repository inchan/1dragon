## Why
`apps/api/src/api/media/routes.ts`에는 JSON 파싱, 스트리밍 종료, 업로드 재시도에서 예외를 조용히 무시하는 코드가 섞여 있습니다. 장애가 발생해도 로그가 남지 않아 원인 추적이 어렵고, 운영에서 문제를 빠르게 격리하기 어렵습니다.

## What Changes
- `apps/api/src/api/media/routes.ts`의 빈 `catch`를 구조화 로그를 남기는 로그 경로로 교체합니다.
- 파싱 실패 시 반환 동작은 유지하되, 파싱 실패 원인과 경로 컨텍스트를 로그로 남깁니다.
- 업로드 재시도 실패 시도별로 오류 맥락(`platform`, `attempt`, `userId`)을 남겨 재시도 동작의 진단성을 높입니다.

## Capabilities

### New Capabilities
- `media-route-error-logging`: 미디어 API와 SSE 라우트에서 예외를 흡수할 때도 운영 관측 가능하도록 로그를 남깁니다.

### Modified Capabilities

- 

## Impact

- `apps/api/src/api/media/routes.ts`: 파싱/재시도/close 경로의 오류 처리 개선(동작 계약 변경 없음)
