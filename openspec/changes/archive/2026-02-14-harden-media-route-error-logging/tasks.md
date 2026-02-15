## 1. Media routes error handling

- [x] 1.1 `apps/api/src/api/media/routes.ts`에서 `shareWithRetry`의 빈 `catch`를 오류 로그를 남기는 형태로 변경한다.
- [x] 1.2 4개 POST 엔드포인트의 `c.req.json().catch(() => null)`를 에러 로그를 남기는 공통 형태로 바꾼다.
- [x] 1.3 SSE stream close의 `controller.close()` 에러 로그를 남기는 형태로 변경한다.

## 2. Verify

- [x] 2.1 OpenSpec 아티팩트 변경 내역이 모든 체크박스 기준으로 반영되었는지 확인한다.
