## Why
시드 스크립트는 배포/운영에서 자주 실행되지만, 현재 `console.log` 기반 메시지를 사용해 중앙 로그 집계와 오류 추적이 어렵습니다. 시드 로그를 구조화 로거로 통일해야 운영 가시성이 개선됩니다.

## What Changes
- `apps/api/src/infrastructure/persistence/seeds/*.ts` 파일에서 `console.log` 출력을 제거하고 로거를 사용해야 한다.
- 실행 완료/업데이트/삽입 상태를 구조화 필드와 함께 기록해야 한다.
- 기존 시드 동작(기록 조건, 갱신/삽입 분기, 종료 처리)은 변경하지 않는다.

## Capabilities
### New Capabilities
- `seed-logging`: 시드 실행의 연결/업서트 로그를 구조화 로거로 남기는 기능

### Modified Capabilities
- 없음 (동작 요구사항 변화 없음)

## Impact
- `apps/api/src/infrastructure/persistence/seeds/model-persona-presets.seed.ts`
- `apps/api/src/infrastructure/persistence/seeds/style-presets.seed.ts`
- `apps/api/src/infrastructure/persistence/seeds/plans.seed.ts`
- `apps/api/src/infrastructure/persistence/seeds/platform-specs.seed.ts`
