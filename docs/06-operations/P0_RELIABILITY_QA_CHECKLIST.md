# P0 신뢰성 QA 검증 체크리스트

## 목적
재시도·백오프·DLQ·서킷브레이커·일일 3건 헬스체크가 계약대로 동작하는지 회귀 검증한다.

## A. 재시도/백오프
- [ ] `MEDIA_GENERATE` 큐 attempts가 3으로 설정되어 있다.
- [ ] 백오프가 exponential로 설정되어 있다.
- [ ] 백오프 초기 지연이 1000ms이다.

## B. DLQ 라우팅
- [ ] 최종 실패 시 `media-generate-dlq`에 레코드가 적재된다.
- [ ] DLQ payload에 `reason`, `attemptsMade`, `maxAttempts`, `sourceQueue`가 포함된다.
- [ ] `PROVIDER_CHAIN_EXHAUSTED`/`NON_RETRYABLE_PROVIDER_ERROR` 사유가 구분 저장된다.

## C. 서킷브레이커
- [ ] failureThreshold 도달 시 상태가 `OPEN`으로 전이된다.
- [ ] openDuration 경과 후 `HALF_OPEN`으로 전이된다.
- [ ] HALF_OPEN 성공 임계 충족 시 `CLOSED`로 복귀한다.
- [ ] HALF_OPEN 실패 시 즉시 `OPEN`으로 복귀한다.

## D. 하루 3건 헬스체크
- [ ] `GET /jobs/health/daily-publish`가 정상 응답한다.
- [ ] 24시간 성공건수 3 이상이면 `HEALTHY`이다.
- [ ] 24시간 성공건수 2면 `AT_RISK`이다.
- [ ] 24시간 성공건수 1 이하면 `UNHEALTHY`이며 `shouldAlert=true`이다.

## E. 회귀 테스트
- [ ] `domain/media/services.test.ts` 통과
- [ ] `infrastructure/providers/i2v/provider-router.test.ts` 통과
- [ ] `infrastructure/queue/workers/media-generate.worker.test.ts` 통과
- [ ] API/typecheck 전체가 통과
