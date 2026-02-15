## Why
입력 파싱 단계에서 `JSON.parse` 예외 처리 및 비정상 값 처리 정책이 느슨해, Toss 웹훅, SSE 스트림, 플랫폼 매핑에서 예기치 않은 입력으로 인해 장애가 전파될 수 있습니다.

## What Changes
- `apps/api/src/api/payments/routes.ts`의 Toss 웹훅 JSON 파싱에 실패 시 예외를 캐치하고, 안정적으로 실패 응답을 반환한다.
- `apps/web/src/features/notification/use-job-stream.ts`의 SSE 메시지 파싱을 형태 검증 가능한 함수로 바꿔 비정상 메시지에 대해 안전하게 무시한다.
- `apps/api/src/infrastructure/persistence/repositories/video-job.repository.ts`의 플랫폼 매핑에서 미확인 값 발생 시 경고 로그를 남기고 기본 정책을 명시한다.

## Capabilities
### New Capabilities
- `input-parser-hardening`: 외부 입력 파싱 실패를 예외 전파 없이 제어 가능한 응답/동작으로 전환한다.

### Modified Capabilities
- `webhook-delivery`, `sse-status-stream`, `video-repository-mapper`

## Impact
- `apps/api/src/api/payments/routes.ts`
- `apps/web/src/features/notification/use-job-stream.ts`
- `apps/api/src/infrastructure/persistence/repositories/video-job.repository.ts`
