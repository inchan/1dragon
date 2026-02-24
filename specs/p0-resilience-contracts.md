# P0 복원력 포트 계약서 (Resilience Port Contracts)

> **문서 목적**: 리뷰 라운드 1에서 확인된 P0 3건의 보완 항목을 타입 레벨 포트 계약으로 확정합니다.
> **작성**: 기획팀 / 클리오
> **상태**: DRAFT → 팀장 승인 대기
> **대상 코드**: `apps/api/src/domain/media/ports.ts` 확장

---

## 1. P0-1: 배치 재시도·백오프·DLQ 규칙

### 1.1 현황 (As-Is)

| 항목 | 현재 값 | 위치 |
|------|---------|------|
| 최대 시도 횟수 | `attempts: 3` | `bullmq.config.ts:27` |
| 백오프 전략 | `exponential, delay: 1000ms` | `bullmq.config.ts:28-31` |
| 워커 재시도 | `MAX_RETRY_COUNT = 2` | `media-generate.worker.ts:34` |
| 실패 작업 보관 | `removeOnFail: { age: 7d, count: 5000 }` | `bullmq.config.ts:37-39` |
| DLQ | **없음** | - |
| 실패 분류 | `canRetryByPolicy()` — 워커 레벨 하드코딩 | `media-generate.worker.ts:68-70` |

### 1.2 갭 (Gap)

1. **DLQ 라우팅 없음**: 최종 실패 작업이 BullMQ의 `removeOnFail`에 의해 7일 후 자동 삭제됨. 수동 복구 불가.
2. **재시도 정책이 포트 계약 바깥**: 도메인이 재시도 가능 여부를 판단하지 못하고 인프라가 단독 결정.
3. **큐별 분화 없음**: `MEDIA_GENERATE`와 `NOTIFICATION_DISPATCH`가 동일한 재시도 정책 사용.
4. **에러 분류 체계 미흡**: retryable vs non-retryable 판단이 `I2VProviderError.retryable`에만 의존.

### 1.3 포트 계약 명세 (To-Be)

#### 도메인 포트 추가: `RetryPolicyPort`

```typescript
// domain/media/ports.ts 에 추가할 타입 계약

/** 에러 심각도 분류 — 재시도 결정의 근거 */
type ErrorSeverity = 'TRANSIENT' | 'DEGRADED' | 'PERMANENT'

/** 재시도 정책 설정 — 큐별로 다를 수 있음 */
interface RetryPolicyConfig {
  readonly maxAttempts: number           // 최대 재시도 횟수 (첫 시도 포함)
  readonly backoffType: 'EXPONENTIAL' | 'LINEAR' | 'FIXED'
  readonly baseDelayMs: number           // 첫 재시도 대기시간
  readonly maxDelayMs: number            // 최대 대기시간 (cap)
  readonly jitterEnabled: boolean        // 지터 적용 여부 (thundering herd 방지)
}

/** DLQ 라우팅 결정 */
interface DlqRoutingDecision {
  readonly shouldRoute: boolean          // DLQ로 이동할지 여부
  readonly reason: string                // 라우팅 사유
  readonly originalQueueName: string     // 원본 큐 이름
  readonly failedAttempts: number        // 실패 횟수
  readonly lastError: string             // 마지막 에러 메시지
  readonly retryable: boolean            // 향후 수동 재시도 가능 여부
}

/** 재시도 판단 포트 (도메인 → 인프라) */
interface RetryPolicyPort {
  /** 에러를 분류하여 재시도 가능 여부 결정 */
  classifyError(error: Error): ErrorSeverity

  /** 현재 상태 기반 재시도 가능 여부 판단 */
  canRetry(input: {
    readonly currentAttempt: number
    readonly maxAttempts: number
    readonly errorSeverity: ErrorSeverity
    readonly jobStatus: string
  }): boolean

  /** DLQ 라우팅 결정 */
  routeToDlq(input: {
    readonly jobId: string
    readonly queueName: string
    readonly failedAttempts: number
    readonly lastError: Error
    readonly errorSeverity: ErrorSeverity
  }): DlqRoutingDecision
}
```

#### 큐별 재시도 정책 값

| 큐 | maxAttempts | backoffType | baseDelayMs | maxDelayMs | jitter |
|----|------------|-------------|-------------|------------|--------|
| `media-generate` | 3 | EXPONENTIAL | 2000 | 60000 | true |
| `media-compose` | 3 | EXPONENTIAL | 1000 | 30000 | false |
| `media-render-variant` | 2 | FIXED | 3000 | 3000 | false |
| `notification-dispatch` | 5 | EXPONENTIAL | 500 | 15000 | true |

#### DLQ 라우팅 규칙

| 조건 | DLQ 라우팅 | 수동 재시도 가능 |
|------|-----------|----------------|
| `PERMANENT` 에러 (인증 실패, 유효하지 않은 입력) | 즉시 DLQ | No |
| `TRANSIENT` 에러 + maxAttempts 소진 | DLQ로 이동 | Yes |
| `DEGRADED` 에러 + maxAttempts 소진 | DLQ로 이동 | Yes (조건부) |
| DLQ 작업 보관 기간 | 30일 | - |
| DLQ 최대 보관 수량 | 10,000건 | - |

---

## 2. P0-2: 크롤러(I2V 제공자) 서킷브레이커 임계치·복구조건

### 2.1 현황 (As-Is)

| 항목 | 현재 값 | 위치 |
|------|---------|------|
| 실패 임계치 | `failureThreshold: 5` | `provider-router.ts:165` |
| OPEN 지속 시간 | `openDurationMs: 30_000` (30초) | `provider-router.ts:169` |
| HALF_OPEN 성공 기준 | 1건 성공 시 즉시 CLOSED | `provider-router.ts:191-195` |
| HALF_OPEN 실패 시 | 즉시 OPEN (threshold=max로 설정) | `provider-router.ts:202-208` |
| 상태 알림 | **없음** | - |
| 메트릭/로깅 | warn 레벨 로그만 | `provider-router.ts:116` |

### 2.2 갭 (Gap)

1. **HALF_OPEN 복구 기준 미흡**: 1건 성공으로 즉시 CLOSED는 너무 낙관적. 불안정한 제공자가 반복적으로 OPEN↔CLOSED를 진동할 위험.
2. **임계치가 포트 계약에 없음**: `options` 파라미터로 받지만 도메인이 관여하지 않음.
3. **서킷 상태 변경 시 알림 없음**: OPEN 전환 시 운영팀이 인지하지 못함.
4. **프로바이더별 차등 정책 없음**: 유료(RUNWAY) vs 무료(HAILUO) 프로바이더가 동일한 임계치 사용.

### 2.3 포트 계약 명세 (To-Be)

#### 도메인 포트 추가: `CircuitBreakerPolicyPort`

```typescript
// domain/media/ports.ts 에 추가할 타입 계약

type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN'

/** 서킷브레이커 정책 — 프로바이더별 차등 설정 가능 */
interface CircuitBreakerConfig {
  readonly failureThreshold: number        // CLOSED → OPEN 전환 실패 횟수
  readonly openDurationMs: number          // OPEN 유지 시간 후 HALF_OPEN 전환
  readonly halfOpenSuccessThreshold: number // HALF_OPEN → CLOSED 전환 성공 횟수
  readonly halfOpenMaxAttempts: number      // HALF_OPEN 상태 최대 시도 횟수
  readonly resetTimeoutMs: number          // 실패 카운터 리셋 타이밍 (윈도우)
}

/** 서킷 상태 전환 이벤트 — 모니터링 알림 트리거용 */
interface CircuitStateTransitionEvent {
  readonly providerName: string
  readonly previousState: CircuitBreakerState
  readonly newState: CircuitBreakerState
  readonly consecutiveFailures: number
  readonly timestamp: Date
  readonly metadata: {
    readonly lastErrorMessage?: string
    readonly halfOpenSuccessCount?: number
    readonly triggerReason: 'FAILURE_THRESHOLD' | 'TIMEOUT_EXPIRED' | 'HALF_OPEN_SUCCESS' | 'HALF_OPEN_FAILURE'
  }
}

/** 서킷브레이커 정책 포트 (도메인 레벨 계약) */
interface CircuitBreakerPolicyPort {
  /** 프로바이더별 설정 조회 */
  getConfig(providerName: string): CircuitBreakerConfig

  /** 상태 전환 이벤트 발행 (알림 트리거) */
  onStateTransition(event: CircuitStateTransitionEvent): void
}
```

#### 프로바이더별 서킷브레이커 정책 값

| 프로바이더 | failureThreshold | openDurationMs | halfOpenSuccessThreshold | halfOpenMaxAttempts | resetTimeoutMs |
|-----------|-----------------|----------------|------------------------|--------------------|----|
| RUNWAY (유료) | 3 | 60,000 (1분) | 2 | 3 | 300,000 (5분) |
| GEMINI_VEO | 5 | 30,000 (30초) | 2 | 3 | 300,000 (5분) |
| HAILUO (무료) | 7 | 20,000 (20초) | 1 | 2 | 180,000 (3분) |
| MINIMAX (무료) | 7 | 20,000 (20초) | 1 | 2 | 180,000 (3분) |

> **설계 근거**: 유료 프로바이더는 더 적은 실패로 빠르게 차단하되, 복구 시 더 신중하게 검증(halfOpenSuccessThreshold=2). 무료 프로바이더는 불안정성을 더 허용하되 빠르게 복구 시도.

#### 알림 트리거 규칙

| 이벤트 | 알림 채널 | 심각도 |
|--------|----------|--------|
| 임의 프로바이더 OPEN 전환 | Slack #ops-alerts | WARNING |
| 2개 이상 프로바이더 동시 OPEN | Slack #ops-critical + PagerDuty | CRITICAL |
| 모든 프로바이더 OPEN (전체 장애) | Slack #ops-critical + PagerDuty + SMS | EMERGENCY |
| 프로바이더 CLOSED 복구 | Slack #ops-alerts | INFO |

---

## 3. P0-3: 하루 3건 발행 보장용 헬스체크·알림 기준

### 3.1 현황 (As-Is)

| 항목 | 현재 상태 |
|------|----------|
| 일일 발행 카운트 추적 | **없음** |
| 발행 파이프라인 헬스체크 | **없음** |
| 발행 SLA 모니터링 | **없음** |
| 장애 시 보상 메커니즘 | **없음** |

### 3.2 갭 (Gap)

전체 파이프라인 모니터링 레이어가 부재합니다. 현재 시스템은 개별 작업의 성공/실패만 추적하며, "오늘 하루 동안 고객에게 약속한 3건이 실제로 발행되었는가?"를 판단하는 집계 레이어가 없습니다.

### 3.3 포트 계약 명세 (To-Be)

#### 도메인 포트 추가: `PublicationHealthPort`

```typescript
// domain/media/ports.ts 에 추가할 타입 계약

type HealthStatus = 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY'

/** 파이프라인 구성요소 상태 */
interface ComponentHealth {
  readonly name: string                    // 'queue' | 'i2v-providers' | 'ffmpeg' | 'storage' | 'social-auth'
  readonly status: HealthStatus
  readonly latencyMs: number | null        // 마지막 응답 시간
  readonly lastCheckedAt: Date
  readonly details?: string                // 상세 상태 메시지
}

/** 일일 발행 현황 스냅샷 */
interface DailyPublicationSnapshot {
  readonly date: string                    // YYYY-MM-DD (KST 기준)
  readonly targetCount: number             // SLA 목표 (기본 3건)
  readonly succeededCount: number          // 성공 건수
  readonly failedCount: number             // 실패 건수
  readonly inProgressCount: number         // 진행 중 건수
  readonly remainingCount: number          // 남은 필요 건수
  readonly completionRate: number          // 달성률 (0~1)
  readonly estimatedCompletionTime: Date | null  // 예상 완료 시점
}

/** 발행 SLA 위반 이벤트 */
interface PublicationSlaEvent {
  readonly type: 'WARNING' | 'VIOLATION' | 'RECOVERY'
  readonly date: string
  readonly currentCount: number
  readonly targetCount: number
  readonly triggerTime: Date
  readonly reason: string
}

/** 발행 헬스체크 포트 (도메인 레벨 계약) */
interface PublicationHealthPort {
  /** 파이프라인 전체 헬스 상태 조회 */
  checkPipelineHealth(): Promise<{
    readonly overallStatus: HealthStatus
    readonly components: ReadonlyArray<ComponentHealth>
  }>

  /** 일일 발행 현황 조회 */
  getDailySnapshot(date: string): Promise<DailyPublicationSnapshot>

  /** SLA 위반 이벤트 발행 */
  onSlaEvent(event: PublicationSlaEvent): void
}
```

#### 헬스체크 실행 주기 및 대상

| 컴포넌트 | 체크 방법 | 주기 | 타임아웃 |
|----------|----------|------|---------|
| Redis/BullMQ | `PING` + 큐 대기열 크기 | 30초 | 3초 |
| I2V 제공자 (각각) | 서킷브레이커 상태 조회 | 30초 | 즉시 (인메모리) |
| FFmpeg | 프로세스 존재 확인 | 60초 | 5초 |
| Storage (R2/S3) | 헤드 오브젝트 | 60초 | 5초 |
| Social Auth Token | 토큰 만료 시간 검증 | 5분 | 3초 |

#### 전체 상태 판정 로직

| 조건 | 판정 |
|------|------|
| 모든 컴포넌트 HEALTHY | **HEALTHY** |
| 1개 컴포넌트 DEGRADED, 나머지 HEALTHY | **DEGRADED** |
| 1개 이상 UNHEALTHY | **UNHEALTHY** |

#### 일일 발행 SLA 알림 규칙

| 시점 (KST) | 조건 | 알림 유형 | 채널 |
|------------|------|----------|------|
| 12:00 | 성공 건수 = 0 | WARNING | Slack #ops-alerts |
| 18:00 | 성공 건수 < 2 | WARNING | Slack #ops-alerts + 담당자 DM |
| 21:00 | 성공 건수 < 3 (SLA 미달 임박) | CRITICAL | Slack #ops-critical + PagerDuty |
| 23:59 | 성공 건수 < 3 (SLA 위반 확정) | VIOLATION | Slack #ops-critical + PagerDuty + 일일 리포트 |
| 다음날 | 전일 SLA 위반 복구 확인 | RECOVERY | Slack #ops-alerts |

#### 보상 메커니즘 (SLA 미달 시)

| 미달 건수 | 보상 방식 |
|----------|----------|
| 1건 부족 | 다음날 4건 발행으로 보상 |
| 2건 부족 | 다음날 5건 발행 + 수동 검수 |
| 3건 (전량 실패) | 즉시 에스컬레이션 + 장애 보고서 + 다음날 6건 발행 |

---

## 통합 의존성 맵

```
P0-1 (재시도/DLQ)
  ↓ 재시도 실패 시 DLQ 라우팅
  → P0-3 (발행 카운트에 실패 반영)

P0-2 (서킷브레이커)
  ↓ 전체 장애 시
  → P0-1 (재시도 정책 변경: 재시도 무의미)
  → P0-3 (발행 불가 예측 → 조기 경고)

P0-3 (헬스체크)
  ↓ SLA 위반 임박 시
  → P0-1 (DLQ 작업 자동 재시도 트리거)
  → P0-2 (서킷 상태 기반 발행 가능성 예측)
```

---

## 구현 선행조건

| 순서 | 항목 | 담당 | 선행 |
|------|------|------|------|
| 1 | `RetryPolicyPort` 인터페이스 정의 | 개발팀 | 본 계약서 승인 |
| 2 | `CircuitBreakerPolicyPort` 인터페이스 정의 | 개발팀 | 본 계약서 승인 |
| 3 | `PublicationHealthPort` 인터페이스 정의 | 개발팀 | 본 계약서 승인 |
| 4 | DLQ 인프라 어댑터 (BullMQ) | 개발팀 | #1 완료 |
| 5 | 서킷브레이커 리팩토링 (ProviderRouter) | 개발팀 | #2 완료 |
| 6 | 헬스체크 스케줄러 + 알림 어댑터 | 개발팀+운영팀 | #3 완료 |
| 7 | 모니터링 대시보드 | 운영팀 | #6 완료 |
| 8 | 통합 검증 | QA팀 | #4, #5, #6 완료 |
