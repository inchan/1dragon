## Why
외부 API 응답은 형식이 바뀌거나 빈 응답이 반환되는 경우가 있는데, 현재 클라이언트마다 파싱 실패 처리 방식이 달라 장애 분석이 일관되지 않습니다.

## What Changes
- `apps/api/src/infrastructure/providers/payment/toss-payments.client.ts`의 응답 파싱을 실패 가능한 상태로 처리해 `TossPaymentsApiError`로 통합합니다.
- `apps/web/src/lib/api.ts`의 `fetchApi`, `uploadApi`, `shareToSocial`에서 JSON 파싱 유틸리티를 통해 비정상 응답을 일관적으로 처리합니다.
- 기존 비즈니스 동작은 변경하지 않고, 오류/파싱 실패 응답을 추적 가능한 형태로 정규화합니다.

## Capabilities
### New Capabilities
- `response-parsing-hardening`: 외부 API 응답 파싱 실패를 예외 메시지와 상태로 안정적으로 분류

### Modified Capabilities
- `toss-payment-client`
- `web-api-client`

## Impact
- `apps/api/src/infrastructure/providers/payment/toss-payments.client.ts`
- `apps/web/src/lib/api.ts`
