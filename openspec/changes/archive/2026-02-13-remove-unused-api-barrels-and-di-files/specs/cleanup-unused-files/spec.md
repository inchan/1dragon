## ADDED Requirements

### Requirement: 미사용 바렐 및 DI 파일 정리
- The implementation SHALL delete all six identified files and leave them absent from the codebase.

#### Scenario: 미사용 파일 삭제

- **WHEN** OpenSpec 변경이 적용된다
- **THEN** 다음 파일이 더 이상 존재하지 않는다
  - `apps/api/src/application/media/index.ts`
  - `apps/api/src/domain/model-persona/index.ts`
  - `apps/api/src/domain/payment/index.ts`
  - `apps/api/src/infrastructure/persistence/index.ts`
  - `apps/api/src/infrastructure/queue/workers/index.ts`
  - `apps/api/src/shared/di-container.ts`
- **AND** 삭제된 파일을 임포트하는 코드가 존재하지 않는다

### Requirement: 동작 경로 보존
- The implementation SHALL preserve runtime behavior by keeping direct runtime imports and not introducing fallback re-exports.

#### Scenario: 기존 동작 경로 유지

- **WHEN** 삭제된 파일들을 제거한 뒤 코드 베이스를 사용한다
- **THEN** 현재 API 라우팅/유스케이스 실행 경로는 기존 직접 import 경로(예: `./generate-video.usecase.js`, `./quality-control.js`)에 의존하도록 유지되어야 한다
- **AND** 삭제된 파일을 참조하던 직접/재수출 경로가 남아있지 않다
