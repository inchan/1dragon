## Why
데이터베이스 연결 유틸(`db.ts`)은 연결 상태를 `console.log`/`console.error`로 출력해 운영 로그 정책과 일치하지 않아 장애 추적 시 일관된 메타데이터와 필드화된 에러 분석이 어렵습니다.
 
## What Changes
- `apps/api/src/infrastructure/persistence/db.ts`에서 데이터베이스 연결/오류 로그를 구조화 로거(`logger`)로 교체해야 한다.
- 연결 테스트 및 풀 에러 경로에서 기존 메시지를 유지하되, 에러 객체를 컨텍스트와 함께 기록해야 한다.
- 기존 동작(반환값/흐름)은 유지하고 로그 출력 수단만 표준화한다.
 
## Capabilities
### New Capabilities
- 없음 (행동 변화 없음)
 
### Modified Capabilities
- `Database connection logging`:
  - 콘솔 출력 대신 구조화 로그로 변경하여 운영 모니터링에서 일관된 쿼리/에러 분석이 가능하게 해야 한다.
 
## Impact
- `apps/api/src/infrastructure/persistence/db.ts`: `console` 로그 제거 및 `logger.error/info` 도입, 실패 컨텍스트 강화
