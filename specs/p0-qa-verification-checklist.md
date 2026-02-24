# P0 QA 검증 체크리스트 (Verification Checklist)

> **문서 목적**: P0 3건의 구현 완료 시 QA팀이 검증해야 할 시나리오·합격 기준을 정의합니다.
> **작성**: 기획팀 / 클리오
> **상태**: DRAFT → QA팀 승인 대기
> **관련 문서**: `specs/p0-resilience-contracts.md`, `specs/p0-operational-standards.md`

---

## 검증 원칙

1. **시나리오 커버리지 우선**: 커버리지 수치보다 비즈니스 시나리오 검증
2. **증거 기반 검증**: 로그·메트릭·상태 변화로 결과 입증
3. **경계값 테스트 필수**: 정상 경로 + 임계치 경계 + 극한 상황
4. **재현 가능성**: 모든 테스트는 결정론적으로 재현 가능해야 함

---

## P0-1: 배치 재시도·백오프·DLQ 검증

### TC-1.1: 재시도 정책 정상 동작

| ID | 시나리오 | 입력 | 기대 결과 | 합격 기준 |
|----|---------|------|----------|----------|
| TC-1.1.1 | media-generate 1차 실패 후 재시도 성공 | TRANSIENT 에러 1회 발생 mock | 2차 시도에서 성공 | 최종 상태 SUCCEEDED, retryCount=1, 로그에 재시도 기록 |
| TC-1.1.2 | media-generate 3회 모두 실패 | TRANSIENT 에러 3회 연속 mock | DLQ로 라우팅 | DLQ에 작업 존재, 상태 FAILED, retryCount=3 |
| TC-1.1.3 | PERMANENT 에러 즉시 DLQ | HTTP 401 에러 mock | 재시도 없이 즉시 DLQ | DLQ에 작업 존재, retryCount=0, 재시도 로그 없음 |
| TC-1.1.4 | notification-dispatch 5회 재시도 | 외부 알림 서비스 5회 실패 mock | 5회 시도 후 DLQ | attempts=5 확인, 백오프 간격 로그 검증 |

### TC-1.2: 백오프 전략 검증

| ID | 시나리오 | 기대 결과 | 합격 기준 |
|----|---------|----------|----------|
| TC-1.2.1 | media-generate exponential backoff | 재시도 간격: ~2s → ~4s → ~8s | 로그 타임스탬프 차이가 예상 범위 내 (±30% jitter 허용) |
| TC-1.2.2 | media-render-variant fixed backoff | 재시도 간격: 3s → 3s | 로그 타임스탬프 차이 = 3000ms (±200ms) |
| TC-1.2.3 | maxDelay 초과 방지 | media-generate에서 지연이 60초를 초과하지 않음 | backoff 계산값이 maxDelayMs를 넘지 않음 |
| TC-1.2.4 | jitter 적용 확인 | 동일 조건 10회 반복 시 재시도 간격이 모두 다름 | 분산 > 0 |

### TC-1.3: DLQ 라우팅 및 관리

| ID | 시나리오 | 기대 결과 | 합격 기준 |
|----|---------|----------|----------|
| TC-1.3.1 | DLQ 작업 보관 | 30일 미만 작업 보존 | DLQ에서 작업 조회 가능 |
| TC-1.3.2 | DLQ 30일 초과 자동 삭제 | 31일 전 작업 | DLQ에서 조회 불가 |
| TC-1.3.3 | DLQ 적재 알림 (100건) | DLQ에 101건 적재 | WARNING 알림 발송 확인 |
| TC-1.3.4 | DLQ 적재 알림 (1000건) | DLQ에 1001건 적재 | CRITICAL 알림 발송 확인 |
| TC-1.3.5 | DLQ 수동 재시도 | DLQ 작업을 원본 큐로 재투입 | 원본 큐에 작업 재등장, DLQ에서 제거 |
| TC-1.3.6 | retryable=false 작업 수동 재시도 차단 | PERMANENT 에러 DLQ 작업 재시도 시도 | 재시도 거부, 오류 메시지 반환 |

### TC-1.4: 에러 분류 검증

| ID | 에러 유형 | 기대 분류 | 합격 기준 |
|----|----------|----------|----------|
| TC-1.4.1 | HTTP 429 | TRANSIENT | `classifyError()` 반환값 = 'TRANSIENT' |
| TC-1.4.2 | HTTP 500 | TRANSIENT | `classifyError()` 반환값 = 'TRANSIENT' |
| TC-1.4.3 | HTTP 401 | PERMANENT | `classifyError()` 반환값 = 'PERMANENT' |
| TC-1.4.4 | HTTP 400 | PERMANENT | `classifyError()` 반환값 = 'PERMANENT' |
| TC-1.4.5 | 품질 미달 (score < 0.7) | DEGRADED | `classifyError()` 반환값 = 'DEGRADED' |
| TC-1.4.6 | OOM | TRANSIENT | `classifyError()` 반환값 = 'TRANSIENT' |

---

## P0-2: 서킷브레이커 임계치·복구 조건 검증

### TC-2.1: CLOSED → OPEN 전환

| ID | 시나리오 | 프로바이더 | 기대 결과 | 합격 기준 |
|----|---------|-----------|----------|----------|
| TC-2.1.1 | RUNWAY 3회 연속 실패 | RUNWAY | OPEN 전환 | circuitState='OPEN', 전환 이벤트 발행, Slack 알림 |
| TC-2.1.2 | GEMINI_VEO 5회 연속 실패 | GEMINI_VEO | OPEN 전환 | circuitState='OPEN' |
| TC-2.1.3 | HAILUO 7회 연속 실패 | HAILUO | OPEN 전환 | circuitState='OPEN' |
| TC-2.1.4 | 실패 윈도우 리셋 | RUNWAY: 2회 실패 → 5분 경과 → 1회 실패 | CLOSED 유지 | consecutiveFailures=1 (리셋 후 재카운트) |
| TC-2.1.5 | 중간 성공으로 리셋 | RUNWAY: 2회 실패 → 1회 성공 → 2회 실패 | CLOSED 유지 | consecutiveFailures=2 |

### TC-2.2: OPEN → HALF_OPEN 전환

| ID | 시나리오 | 기대 결과 | 합격 기준 |
|----|---------|----------|----------|
| TC-2.2.1 | RUNWAY OPEN 60초 경과 | HALF_OPEN 전환 | 정확히 60초(±1초) 후 HALF_OPEN |
| TC-2.2.2 | HAILUO OPEN 20초 경과 | HALF_OPEN 전환 | 정확히 20초(±1초) 후 HALF_OPEN |
| TC-2.2.3 | OPEN 중 요청 차단 | OPEN 상태에서 생성 요청 | 해당 프로바이더 스킵, 다음 체인으로 페일오버 |

### TC-2.3: HALF_OPEN → CLOSED 복구

| ID | 시나리오 | 프로바이더 | 기대 결과 | 합격 기준 |
|----|---------|-----------|----------|----------|
| TC-2.3.1 | RUNWAY HALF_OPEN에서 2회 연속 성공 | RUNWAY | CLOSED 복구 | circuitState='CLOSED', 복구 이벤트 발행 |
| TC-2.3.2 | RUNWAY HALF_OPEN에서 1회 성공 1회 실패 | RUNWAY | OPEN 재진입 | circuitState='OPEN', openedAt 갱신 |
| TC-2.3.3 | HAILUO HALF_OPEN에서 1회 성공 | HAILUO | CLOSED 복구 | halfOpenSuccessThreshold=1이므로 즉시 복구 |
| TC-2.3.4 | HALF_OPEN 최대 시도 초과 | RUNWAY: 3회 시도 중 2회 미만 성공 | OPEN 재진입 | halfOpenMaxAttempts=3 소진 |

### TC-2.4: 에스컬레이션 검증

| ID | 시나리오 | 기대 결과 | 합격 기준 |
|----|---------|----------|----------|
| TC-2.4.1 | L1: 1개 프로바이더 OPEN | Slack #ops-alerts 알림 | 알림 수신 확인 (메시지 내용에 프로바이더명 포함) |
| TC-2.4.2 | L2: 2개 프로바이더 동시 OPEN | Slack #ops-critical 알림 | 알림 수신 확인 |
| TC-2.4.3 | L4: 전체 프로바이더 OPEN | PagerDuty + SMS | PagerDuty 인시던트 생성 + SMS 수신 |
| TC-2.4.4 | 복구 알림 | 프로바이더 CLOSED 복구 | Slack #ops-alerts INFO 알림 |

### TC-2.5: 프로바이더별 차등 정책 검증

| ID | 시나리오 | 합격 기준 |
|----|---------|----------|
| TC-2.5.1 | RUNWAY vs HAILUO failureThreshold 차이 | RUNWAY=3, HAILUO=7 정확히 적용됨 |
| TC-2.5.2 | RUNWAY vs HAILUO openDuration 차이 | RUNWAY=60s, HAILUO=20s 정확히 적용됨 |
| TC-2.5.3 | RUNWAY vs HAILUO halfOpenSuccessThreshold 차이 | RUNWAY=2, HAILUO=1 정확히 적용됨 |

---

## P0-3: 일일 발행 보장 헬스체크·알림 검증

### TC-3.1: 파이프라인 헬스체크 엔드포인트

| ID | 시나리오 | 기대 결과 | 합격 기준 |
|----|---------|----------|----------|
| TC-3.1.1 | 전체 정상 | HEALTHY | HTTP 200, overallStatus='HEALTHY' |
| TC-3.1.2 | 1개 컴포넌트 DEGRADED | DEGRADED | HTTP 200, overallStatus='DEGRADED' |
| TC-3.1.3 | 1개 컴포넌트 UNHEALTHY | UNHEALTHY | HTTP 503, overallStatus='UNHEALTHY' |
| TC-3.1.4 | Redis 연결 끊김 | UNHEALTHY | redis.status='UNHEALTHY', 3초 내 응답 |
| TC-3.1.5 | 서킷브레이커 상태 반영 | 프로바이더 OPEN 시 해당 컴포넌트 DEGRADED | components에 circuitState 포함 |
| TC-3.1.6 | 응답 시간 포함 | 모든 컴포넌트에 latencyMs | null 아닌 양수값 (해당하는 경우) |

### TC-3.2: 일일 발행 스냅샷

| ID | 시나리오 | 기대 결과 | 합격 기준 |
|----|---------|----------|----------|
| TC-3.2.1 | 당일 발행 현황 조회 | 정확한 카운트 | succeeded + failed + inProgress가 실제 DB와 일치 |
| TC-3.2.2 | remainingCount 계산 | target - succeeded | remainingCount = max(0, target - succeeded) |
| TC-3.2.3 | completionRate 계산 | succeeded / target | 0~1 범위의 소수, 소수점 2자리 |
| TC-3.2.4 | KST 기준 날짜 경계 | 23:59 KST에 작업 성공 | 당일 카운트에 포함 |
| TC-3.2.5 | KST 기준 날짜 경계 | 00:01 KST에 작업 성공 | 다음날 카운트에 포함 |

### TC-3.3: SLA 알림 검증

| ID | 시나리오 | 시점 | 기대 결과 | 합격 기준 |
|----|---------|------|----------|----------|
| TC-3.3.1 | 12:00 WARNING | 12:00 KST, 성공 0건 | WARNING 알림 | Slack #ops-alerts 메시지 수신 |
| TC-3.3.2 | 18:00 WARNING | 18:00 KST, 성공 1건 | WARNING 알림 + 담당자 DM | 두 채널 모두 수신 |
| TC-3.3.3 | 21:00 CRITICAL | 21:00 KST, 성공 2건 | CRITICAL 알림 | Slack #ops-critical + PagerDuty |
| TC-3.3.4 | 23:59 VIOLATION | 23:59 KST, 성공 2건 | VIOLATION 기록 | SLA 위반 레코드 생성 + 알림 |
| TC-3.3.5 | 정상 달성 | 15:00 KST, 성공 3건 | 추가 알림 없음 | 알림 미발송 |
| TC-3.3.6 | 중복 알림 방지 | 12:00 WARNING 후 12:30 재체크 | 1시간 내 중복 방지 | 두번째 알림 미발송 |

### TC-3.4: 보상 정책 검증

| ID | 시나리오 | 기대 결과 | 합격 기준 |
|----|---------|----------|----------|
| TC-3.4.1 | 1건 부족 | 다음날 목표 = 4건 | dailyTarget 자동 상향 확인 |
| TC-3.4.2 | 2건 부족 | 다음날 목표 = 5건 | dailyTarget 자동 상향 + 원인 분석 트리거 |
| TC-3.4.3 | 전량 실패 | 다음날 목표 = 6건 + DLQ 재시도 | 목표 상향 + DLQ 자동 재시도 확인 |
| TC-3.4.4 | 연속 2일 미달 | PagerDuty 상시 + RCA 의무 | PagerDuty 활성 상태 + RCA 태스크 생성 |

### TC-3.5: 자동 큐 투입 검증

| ID | 시나리오 | 기대 결과 | 합격 기준 |
|----|---------|----------|----------|
| TC-3.5.1 | 06:00 큐 비어있음 | 자동 3건 큐 투입 | media-generate 큐에 3건 추가됨 |
| TC-3.5.2 | 06:00 큐에 2건 존재 | 1건만 추가 투입 | 총 3건 큐잉 |
| TC-3.5.3 | 18:00 DLQ 재시도 트리거 | 성공 < 2건 + DLQ에 작업 존재 | DLQ → 원본 큐 자동 이동 |

---

## 통합 시나리오 (Cross-cutting)

### TC-INT-1: 파이프라인 전체 플로우

| ID | 시나리오 | 합격 기준 |
|----|---------|----------|
| TC-INT-1.1 | 정상 플로우: 큐잉 → 생성 → 변형 → 성공 | 일일 카운트 +1, 헬스체크 HEALTHY |
| TC-INT-1.2 | 제공자 장애 + 재시도 + 성공 | 재시도 로그, 서킷 상태 유지, 카운트 +1 |
| TC-INT-1.3 | 전체 장애 + DLQ + 보상 | DLQ 적재, SLA 위반, 다음날 보상 목표 상향 |

### TC-INT-2: 서킷브레이커 + 재시도 연동

| ID | 시나리오 | 합격 기준 |
|----|---------|----------|
| TC-INT-2.1 | 프로바이더 OPEN 시 페일오버 + 재시도 | OPEN 프로바이더 스킵, 대체 프로바이더로 시도 |
| TC-INT-2.2 | 전체 프로바이더 OPEN 시 즉시 DLQ | 재시도 없이 DLQ 라우팅 (PERMANENT 처리) |

### TC-INT-3: 헬스체크 + 알림 연동

| ID | 시나리오 | 합격 기준 |
|----|---------|----------|
| TC-INT-3.1 | 헬스체크 UNHEALTHY → 알림 연쇄 | 파이프라인 UNHEALTHY 감지 → 발행 불가 예측 → 조기 WARNING |
| TC-INT-3.2 | 헬스체크 복구 → 알림 | UNHEALTHY → HEALTHY 전환 시 RECOVERY 알림 |

---

## 검증 환경 요구사항

| 항목 | 요구사항 |
|------|---------|
| 테스트 환경 | Staging (프로덕션 미러) |
| Mock 서버 | I2V 제공자 Mock (에러 주입 가능) |
| 시간 제어 | 시스템 시간 조작 가능 (헬스체크 시점 테스트) |
| 알림 채널 | 테스트 전용 Slack 채널 + Mock PagerDuty |
| 데이터 정리 | 테스트 전후 DLQ·큐·DB 초기화 스크립트 |

---

## 합격 기준 요약

| P0 항목 | 필수 통과 TC 수 | 비율 기준 |
|---------|---------------|----------|
| P0-1 재시도/DLQ | 14/14 TC | 100% |
| P0-2 서킷브레이커 | 16/16 TC | 100% |
| P0-3 헬스체크/알림 | 17/17 TC | 100% |
| 통합 시나리오 | 5/5 TC | 100% |
| **전체** | **52/52 TC** | **100%** |

> **전체 TC 100% 통과 시에만 P0 보완 완료로 인정합니다.**

---

## 문서 승인

| 역할 | 이름 | 승인 상태 | 일자 |
|------|------|----------|------|
| 기획팀 | 클리오 | 작성 완료 | 2026-02-24 |
| QA팀 | - | 대기 | - |
| 개발팀 | - | 대기 | - |
| 운영팀 | - | 대기 | - |
