## Why
운영 로그를 수집할 때 콘솔 출력은 레벨/필드 표준화가 어렵고 추적성이 떨어집니다. 잔여 콘솔 로그까지 정리하면 로그 기반 디버깅 품질을 통일할 수 있습니다.

## What Changes
- `apps/api/src/api/products/routes.ts`의 `console.info`를 `logger.info`로 교체해야 하며 `SHALL` 기존 동작을 유지합니다.
- `apps/api/src/application/product/analyze-image.usecase.ts`의 `console.warn`을 `logger.warn`으로 교체해야 하며 `SHALL` 기존 동작을 유지합니다.
- `apps/api/src/infrastructure/auth/better-auth.ts`의 `console.error`를 `logger.error`로 교체해야 하며 `SHALL` 기존 동작을 유지합니다.
- 로그는 동작 변경 없이 출력 방식만 구조화 로거로 전환해야 하며 이 변경은 `MUST` 적용됩니다.

## Capabilities
### New Capabilities
- `console-log-standardization`: 잔여 콘솔 로그를 구조화 로거로 교체하는 기능

### Modified Capabilities
- 없음

## Impact
- `apps/api/src/api/products/routes.ts`
- `apps/api/src/application/product/analyze-image.usecase.ts`
- `apps/api/src/infrastructure/auth/better-auth.ts`
