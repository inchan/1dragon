## 1. Media route standardization

- [x] 1.1 `apps/api/src/api/media/routes.ts`에서 validation 실패 응답 메시지를 표준 포맷으로 교체

## 2. Payments route standardization

- [x] 2.1 `apps/api/src/api/payments/routes.ts`에서 createSubscription validation 실패 응답을 표준 포맷으로 교체
- [x] 2.2 `apps/api/src/api/payments/routes.ts`에서 cancelSubscription validation 실패 응답을 표준 포맷으로 교체
- [x] 2.3 `apps/api/src/api/payments/routes.ts`에서 refund validation 실패 응답을 표준 포맷으로 교체
- [x] 2.4 변경 파일에서 `VALIDATION_ERROR` 문자열 사용을 제거하고 `ErrorCode.VALIDATION` 사용
