## 1. Logging refactor

- [x] 1.1 `apps/api/src/infrastructure/persistence/db.ts`에서 `logger`를 import 한다.
- [x] 1.2 Pool 에러 핸들러의 `console.error`를 `logger.error`로 교체한다.
- [x] 1.3 `testConnection`의 성공/실패 로그를 `logger.info`/`logger.error`로 교체한다.

## 2. Verification

- [x] 2.1 변경된 로그 경로가 정확한 파일에 반영되었는지 확인한다.
