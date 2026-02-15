## Why

`knip` 분석에서 미사용 파일로 표시된 바렐/DI 진입점 파일이 6개 존재합니다.
현재 실행 경로에서 실제로 참조되지 않는 모듈은 유지비용만 증가시키며, 코드 구조 이해와 유지보수성에 부정적입니다.
기능 변경 없이 정리하고자 합니다.

## What Changes

이 변경은 다음 요구사항을 충족해야 합니다.

- The repository SHALL remove all six identified unused files listed below.

- 삭제 대상 6개 파일:
  - `apps/api/src/application/media/index.ts`
  - `apps/api/src/domain/model-persona/index.ts`
  - `apps/api/src/domain/payment/index.ts`
  - `apps/api/src/infrastructure/persistence/index.ts`
  - `apps/api/src/infrastructure/queue/workers/index.ts`
  - `apps/api/src/shared/di-container.ts`
- The repository SHALL preserve direct import usage in existing runtime paths.

## Capabilities

### New Capabilities

- 없음 (기능 추가 없음)

### Modified Capabilities

- 프로젝트 정리성/탐색 비용이 개선됩니다.
- 바렐 기반 의존성의 혼선 가능성을 줄입니다.

## Impact

- 제거 파일은 개별적으로 독립되어 있어 삭제 시 런타임 동작 변경이 없습니다.
- OpenSpec 과제 단위로 관리하여 추후 이력 추적이 쉬워집니다.
