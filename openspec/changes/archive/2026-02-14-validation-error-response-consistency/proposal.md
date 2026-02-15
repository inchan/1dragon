## Why
여러 라우트에서 입력 유효성 실패 시 서로 다른 에러 코드와 구조로 응답하고 있어 클라이언트 측 처리 로직이 분산됩니다. 같은 형태의 입력 스키마 실패를 같은 계약으로 통일해야 호출자 호환성을 높이고 디버깅 비용을 줄일 수 있습니다.

## What Changes
- `apps/api/src/api/media/routes.ts`의 `safeParse` 실패 응답을 **MUST** `ErrorCode.VALIDATION` 기반 공통 구조로 바꿉니다.
- `apps/api/src/api/payments/routes.ts`의 구독/환불 관련 `safeParse` 실패 응답을 공통 구조로 바꿉니다.
- 각 실패 응답에 `details.fieldErrors`를 포함해 필드 단위 오류를 제공하고, 기존 동작(요청 흐름)은 변경하지 않습니다.

## Capabilities
### New Capabilities
- `route-validation`: 라우트 입력 유효성 실패 응답 형식 표준화

### Modified Capabilities
- 없음 (기능 변경 없음, 응답 포맷 정합성 강화)

## Impact
- `apps/api/src/api/media/routes.ts`
- `apps/api/src/api/payments/routes.ts`
