# P0 운영 기준서 (Operational Standards)

> **문서 목적**: P0 3건 복원력 항목의 운영 파라미터·임계치·에스컬레이션 기준을 확정합니다.
> **작성**: 기획팀 / 클리오
> **상태**: DRAFT → 운영팀 승인 대기
> **관련 문서**: `specs/p0-resilience-contracts.md` (포트 계약서)

---

## 1. 배치 재시도 운영 기준

### 1.1 큐별 재시도 정책

#### media-generate (핵심 파이프라인)

| 파라미터 | 값 | 근거 |
|---------|-----|------|
| maxAttempts | 3 | I2V 제공자 장애 평균 복구시간 기준 |
| backoffType | EXPONENTIAL | 제공자 Rate Limit 회피 |
| baseDelayMs | 2,000 | 제공자 API 평균 응답 5초, 일시적 장애 복구 대기 |
| maxDelayMs | 60,000 | 1분 이상 대기는 사용자 경험 저해 |
| jitter | true (+/- 20%) | 동시 재시도 분산 (thundering herd 방지) |

**실제 지연 시간 예시** (jitter 미적용 기준):
- 1차 재시도: 2초 후
- 2차 재시도: 4초 후
- 3차 재시도: 8초 후 (maxDelay 미초과)

#### media-compose (FFmpeg 합성)

| 파라미터 | 값 | 근거 |
|---------|-----|------|
| maxAttempts | 3 | 파일 I/O 일시 오류 대응 |
| backoffType | EXPONENTIAL | 디스크/메모리 일시 부족 대기 |
| baseDelayMs | 1,000 | 로컬 자원이므로 짧은 대기 |
| maxDelayMs | 30,000 | - |
| jitter | false | 동시성 낮음 |

#### media-render-variant (플랫폼 변형)

| 파라미터 | 값 | 근거 |
|---------|-----|------|
| maxAttempts | 2 | FFmpeg 동일 입력 반복 실패 가능성 낮음 |
| backoffType | FIXED | 동일 조건 재시도 |
| baseDelayMs | 3,000 | - |
| maxDelayMs | 3,000 | - |
| jitter | false | - |

#### notification-dispatch (알림 발송)

| 파라미터 | 값 | 근거 |
|---------|-----|------|
| maxAttempts | 5 | 외부 알림 서비스 일시 장애 대응 |
| backoffType | EXPONENTIAL | Rate Limit 회피 |
| baseDelayMs | 500 | 알림은 빠른 재시도 필요 |
| maxDelayMs | 15,000 | - |
| jitter | true | 대량 알림 분산 |

### 1.2 DLQ 운영 규칙

| 항목 | 값 |
|------|-----|
| DLQ 큐 이름 | `{원본큐이름}-dlq` (예: `media-generate-dlq`) |
| DLQ 작업 보관 기간 | 30일 |
| DLQ 최대 보관 수량 | 10,000건 |
| DLQ 작업 수동 재시도 | 운영 대시보드에서 가능 |
| DLQ 적재 알림 | 100건 초과 시 WARNING, 1000건 초과 시 CRITICAL |

### 1.3 에러 분류 기준

| 에러 유형 | 심각도 | 재시도 | DLQ | 예시 |
|----------|--------|--------|-----|------|
| HTTP 429 (Rate Limit) | TRANSIENT | Yes | 소진 시 | 제공자 API 과부하 |
| HTTP 5xx (서버 오류) | TRANSIENT | Yes | 소진 시 | 제공자 내부 오류 |
| HTTP 408 (타임아웃) | TRANSIENT | Yes | 소진 시 | 네트워크 지연 |
| HTTP 401/403 (인증 실패) | PERMANENT | No | 즉시 | API 키 만료/무효 |
| HTTP 400 (잘못된 요청) | PERMANENT | No | 즉시 | 입력 데이터 오류 |
| FFmpeg 프로세스 오류 | DEGRADED | Yes (1회) | 소진 시 | 코덱/포맷 문제 |
| 메모리 부족 (OOM) | TRANSIENT | Yes | 소진 시 | 일시적 자원 부족 |
| 품질 평가 미달 (< 0.7) | DEGRADED | Yes (1회) | 소진 시 | 생성 품질 문제 |

---

## 2. 서킷브레이커 운영 기준

### 2.1 상태 전환 다이어그램

```
              실패 < threshold
  ┌─────────────────────────────┐
  │                             │
  ▼         실패 ≥ threshold     │
CLOSED ────────────────────► OPEN
  ▲                             │
  │   성공 ≥ halfOpenSuccess     │ openDuration 경과
  │   Threshold                  │
  │                             ▼
  └──────────────────────── HALF_OPEN
                                │
                 실패 발생        │
                 ──────────────► OPEN (재진입)
```

### 2.2 프로바이더별 상세 운영 파라미터

#### RUNWAY (유료, 핵심 프로바이더)

- **빠른 차단**: 3회 연속 실패 시 OPEN (유료 API 비용 낭비 방지)
- **신중한 복구**: HALF_OPEN에서 2건 연속 성공 필요 (3건 시도 내)
- **긴 냉각**: 60초 OPEN 유지 (유료 제공자 안정화 대기)
- **실패 윈도우**: 5분 내 실패만 누적 (5분 이상 경과 시 리셋)

#### GEMINI_VEO (중간급)

- **표준 차단**: 5회 연속 실패 시 OPEN
- **표준 복구**: HALF_OPEN에서 2건 연속 성공 필요 (3건 시도 내)
- **표준 냉각**: 30초 OPEN 유지
- **실패 윈도우**: 5분

#### HAILUO / MINIMAX (무료, 보조 프로바이더)

- **관대한 차단**: 7회 연속 실패 시 OPEN (무료이므로 더 많이 시도)
- **빠른 복구**: HALF_OPEN에서 1건 성공 시 CLOSED (2건 시도 내)
- **짧은 냉각**: 20초 OPEN 유지 (빠르게 재시도)
- **실패 윈도우**: 3분

### 2.3 에스컬레이션 매트릭스

| 단계 | 조건 | 대응 | 알림 대상 |
|------|------|------|----------|
| L1 | 1개 프로바이더 OPEN | 로그 기록 + Slack #ops-alerts | 운영팀 |
| L2 | 2개 프로바이더 동시 OPEN | Slack #ops-critical + 대시보드 배너 | 운영팀 + 개발팀 |
| L3 | 유료+무료 혼합 OPEN (서비스 품질 저하) | PagerDuty + Slack | 운영팀 + 개발팀 + PM |
| L4 | 전체 프로바이더 OPEN (전체 장애) | PagerDuty + SMS + 긴급 회의 | 전원 |

### 2.4 서킷 상태 메트릭 수집

| 메트릭 | 수집 주기 | 보관 기간 |
|--------|----------|----------|
| 프로바이더별 서킷 상태 | 실시간 (상태 전환 시) | 90일 |
| 프로바이더별 성공/실패 카운트 | 1분 집계 | 90일 |
| 프로바이더별 응답 시간 (p50/p95/p99) | 1분 집계 | 30일 |
| 페일오버 횟수 | 실시간 | 90일 |
| OPEN 지속 시간 | 실시간 | 90일 |

---

## 3. 일일 발행 보장 운영 기준

### 3.1 SLA 정의

| 항목 | 값 |
|------|-----|
| 일일 최소 발행 목표 | 3건/일 |
| SLA 측정 기준 시간대 | KST (UTC+9) |
| SLA 측정 단위일 | 00:00 ~ 23:59 KST |
| 성공 판정 기준 | 비디오 생성 + 최소 1개 플랫폼 변형 렌더링 완료 (`SUCCEEDED` 상태) |
| SLA 달성률 계산 | `성공 건수 / 목표 건수 * 100` |

### 3.2 시간대별 체크포인트

| 시점 (KST) | 체크 내용 | 기대치 | 미달 시 조치 |
|------------|----------|--------|------------|
| 06:00 | 당일 큐 투입 확인 | ≥ 3건 큐잉됨 | 자동 큐 투입 트리거 |
| 10:00 | 1차 진행 확인 | ≥ 1건 GENERATING 이상 | WARNING 알림 |
| 14:00 | 중간 점검 | ≥ 1건 SUCCEEDED | WARNING 알림 + 대기 작업 우선순위 상향 |
| 18:00 | 2차 진행 확인 | ≥ 2건 SUCCEEDED | CRITICAL 알림 + DLQ 작업 자동 재시도 |
| 21:00 | 최종 마감 전 점검 | ≥ 3건 SUCCEEDED | EMERGENCY 알림 + 수동 개입 요청 |
| 23:59 | 일일 마감 | 3건 SUCCEEDED | SLA 위반 기록 + 보상 트리거 |

### 3.3 파이프라인 헬스체크 엔드포인트

```
GET /api/v1/health/pipeline
```

**응답 구조**:
```json
{
  "overallStatus": "HEALTHY | DEGRADED | UNHEALTHY",
  "timestamp": "2026-02-24T09:00:00+09:00",
  "components": [
    { "name": "redis", "status": "HEALTHY", "latencyMs": 2 },
    { "name": "queue-media-generate", "status": "HEALTHY", "pendingJobs": 1, "activeJobs": 1 },
    { "name": "i2v-runway", "status": "HEALTHY", "circuitState": "CLOSED" },
    { "name": "i2v-hailuo", "status": "DEGRADED", "circuitState": "HALF_OPEN" },
    { "name": "ffmpeg", "status": "HEALTHY", "latencyMs": null },
    { "name": "storage", "status": "HEALTHY", "latencyMs": 45 }
  ],
  "dailyPublication": {
    "date": "2026-02-24",
    "target": 3,
    "succeeded": 1,
    "failed": 0,
    "inProgress": 1,
    "remaining": 1,
    "completionRate": 0.33,
    "onTrack": true
  }
}
```

### 3.4 알림 채널 설정

| 알림 유형 | 채널 | 빈도 제한 |
|----------|------|----------|
| WARNING | Slack #ops-alerts | 같은 유형 1시간 내 중복 방지 |
| CRITICAL | Slack #ops-critical + 담당자 DM | 30분 내 중복 방지 |
| EMERGENCY | Slack #ops-critical + PagerDuty + SMS | 중복 방지 없음 (항상 발송) |
| INFO (복구) | Slack #ops-alerts | 중복 방지 없음 |
| DAILY_REPORT | Slack #daily-report | 1일 1회 (00:05 KST) |

### 3.5 보상 정책 운영 절차

| 미달 수준 | 자동 조치 | 수동 조치 |
|----------|----------|----------|
| 1건 부족 | 다음날 목표 4건으로 자동 상향 | - |
| 2건 부족 | 다음날 목표 5건으로 자동 상향 | 원인 분석 리포트 작성 |
| 전량 실패 | 다음날 목표 6건 + DLQ 전량 재시도 | 장애 보고서 + 긴급 회의 |
| 연속 2일 미달 | 자동 목표 상향 + PagerDuty 상시 활성 | 근본 원인 분석 (RCA) 의무 |

---

## 4. 통합 모니터링 대시보드 요구사항

### 4.1 대시보드 패널 구성

| 패널 | 내용 | 갱신 주기 |
|------|------|----------|
| **일일 발행 게이지** | 오늘 성공/실패/진행중 + 목표 대비 달성률 | 실시간 |
| **파이프라인 헬스맵** | 컴포넌트별 상태 히트맵 | 30초 |
| **서킷브레이커 상태** | 프로바이더별 현재 상태 + 최근 전환 이력 | 실시간 |
| **큐 현황** | 큐별 대기/활성/완료/실패 건수 | 10초 |
| **DLQ 현황** | DLQ별 적재 건수 + 최근 30일 추이 | 1분 |
| **에러율 차트** | 시간대별 에러 발생률 (프로바이더/큐별) | 1분 |
| **SLA 히스토리** | 최근 30일 일일 SLA 달성률 추이 | 1일 |

---

## 5. 문서 승인

| 역할 | 이름 | 승인 상태 | 일자 |
|------|------|----------|------|
| 기획팀 | 클리오 | 작성 완료 | 2026-02-24 |
| 개발팀 | - | 대기 | - |
| 운영팀 | - | 대기 | - |
| QA팀 | - | 대기 | - |
