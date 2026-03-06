# P0 신뢰성 포트 계약서

## 목적
P0 3항목(재시도·백오프·DLQ, 서킷브레이커, 하루 3건 헬스체크)의 기준을 타입 레벨로 잠그고, 인프라 구현이 동일 기준을 따르도록 강제한다.

## 계약 위치
- `apps/api/src/domain/media/ports.ts`
- `apps/api/src/domain/media/services.ts`

## 계약 항목

### 1) 재시도/백오프 계약
- `QueueRetryPolicy`
  - `maxAttempts`
  - `strategy`
  - `baseDelayMs`
  - `maxDelayMs`

기준값(`MEDIA_GENERATE`):
- 최대 시도: `3`
- 백오프: `EXPONENTIAL`
- 초기 지연: `1000ms`
- 최대 지연 상한: `30000ms`

### 2) DLQ 계약
- `QueueDeadLetterPolicy`
  - `queueName`
  - `retainFailedForHours`
  - `routeReasons`

기준값(`MEDIA_GENERATE`):
- DLQ 큐: `media-generate-dlq`
- 보관기간: `720h(30일)`
- 라우팅 사유:
  - `MAX_ATTEMPTS_EXCEEDED`
  - `NON_RETRYABLE_PROVIDER_ERROR`
  - `PROVIDER_CHAIN_EXHAUSTED`
  - `UNKNOWN`

### 3) 서킷브레이커 계약
- `CircuitBreakerPolicy`
  - `failureThreshold`
  - `openDurationMs`
  - `halfOpenMaxCalls`
  - `successThresholdToClose`

기준값:
- 실패 임계치: `3`
- 오픈 유지: `30000ms`
- HALF_OPEN 최대 검증 호출: `2`
- CLOSE 복귀 성공 임계: `1`

### 4) 하루 3건 헬스체크 계약
- `DailyPublishHealthPolicy`
  - `lookbackHours`
  - `targetSuccessCount`
  - `warningBelowCount`
  - `criticalBelowCount`
  - `alertCooldownMinutes`

기준값:
- 검사창: `24h`
- 목표 성공 건수: `3`
- 경고 임계: `< 3`
- 치명 임계: `<= 1`
- 알림 쿨다운: `60m`

## 소비 지점
- Queue 설정: `apps/api/src/infrastructure/queue/bullmq.config.ts`
- Provider 서킷 제어: `apps/api/src/infrastructure/providers/i2v/provider-router.ts`
- Worker 실패 DLQ 라우팅: `apps/api/src/infrastructure/queue/workers/media-generate.worker.ts`
- 일일 헬스 API: `apps/api/src/api/media/job-routes.ts` (`GET /jobs/health/daily-publish`)
