## Why
I2V 외부 API 호출에서 `response.json().catch(() => ({}))` 사용으로 파싱 실패가 오류로 보이지 않고 빈 객체로 변환되어, 장애 원인 추적과 재시도 판단이 어려워집니다.

## What Changes
- `apps/api/src/infrastructure/providers/i2v/base-provider.ts`에서 비정상 응답 JSON 파싱을 실패 객체로 대체하지 않고 예외로 처리하도록 변경한다.
- `apps/api/src/infrastructure/providers/i2v/gemini-veo.adapter.ts`의 자체 request 메서드도 동일하게 일관된 파싱 실패 처리와 명시적 오류를 적용한다.
- 기존 성공 응답 형식은 유지하고, 파싱 실패/비정상 응답만 제어 가능한 오류로 바꾼다.

## Capabilities
### New Capabilities
- `i2v-response-hardening`: I2V 공급자 응답 파싱 실패를 명시적으로 분류해 장애 가시성을 높인다.

### Modified Capabilities
- `media-generation-api-clients`

## Impact
- `apps/api/src/infrastructure/providers/i2v/base-provider.ts`
- `apps/api/src/infrastructure/providers/i2v/gemini-veo.adapter.ts`
