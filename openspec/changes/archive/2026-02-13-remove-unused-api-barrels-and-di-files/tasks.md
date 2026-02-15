## 1. 삭제 대상 파일 정리

- [x] 1.1 `apps/api/src/application/media/index.ts` 삭제
- [x] 1.2 `apps/api/src/domain/model-persona/index.ts` 삭제
- [x] 1.3 `apps/api/src/domain/payment/index.ts` 삭제
- [x] 1.4 `apps/api/src/infrastructure/persistence/index.ts` 삭제
- [x] 1.5 `apps/api/src/infrastructure/queue/workers/index.ts` 삭제
- [x] 1.6 `apps/api/src/shared/di-container.ts` 삭제

## 2. 정리 검토

- [x] 2.1 삭제 파일 참조 검색으로 잔존 import가 없는지 점검 (`rg` 검증: 해당 패턴 0건)
