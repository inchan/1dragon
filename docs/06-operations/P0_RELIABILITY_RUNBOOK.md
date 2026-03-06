# P0 신뢰성 운영 기준서

## 1) 재시도·백오프 운영

### 정책
- 대상 큐: `media-generate`
- 최대 시도: 3회
- 백오프: 지수 증가 (1s -> 2s -> 4s, 상한 30s)

### 운영 기준
- 동일 작업이 3회 연속 실패하면 정상 큐 재시도 중지
- 최종 실패 건은 DLQ로 라우팅
- 장애구간 종료 후 DLQ 재처리는 수동 승인 후 배치로 수행

## 2) DLQ 운영

### 큐
- `media-generate-dlq`

### 라우팅 조건
- 최대 시도 초과
- Non-retryable provider 에러
- Provider chain 전체 소진
- 기타 미분류 오류

### 보존
- 실패 레코드 30일 보관

### 온콜 대응
1. 5분 내 DLQ 증가 추세 확인
2. 사유 분포(Provider/입력/시스템) 분해
3. provider 장애면 서킷 상태와 외부 API 상태 동시 확인
4. 복구 후 재처리 batch 실행

## 3) 서킷브레이커 운영

### 기본값
- 실패 임계: 3
- OPEN 유지: 30초
- HALF_OPEN 검사 최대 호출: 2
- CLOSE 복귀 성공 임계: 1

### 상태 전이
- `CLOSED` -> 연속 실패 임계 도달 시 `OPEN`
- `OPEN` -> 30초 경과 시 `HALF_OPEN`
- `HALF_OPEN` -> 성공 임계 충족 시 `CLOSED`
- `HALF_OPEN` -> 실패 시 즉시 `OPEN`

## 4) 하루 3건 발행 보장 헬스체크

### API
- `GET /api/v1/media/jobs/health/daily-publish`

### 기준
- lookback: 24시간
- 목표: 성공 발행 3건
- 상태:
  - `HEALTHY`: >= 3
  - `AT_RISK`: 2
  - `UNHEALTHY`: 0~1

### 알림 기준
- `shouldAlert=true` (`< 3`)이면 운영 알림 대상
- 동일 사용자 반복 알림은 60분 쿨다운 적용 권장

## 5) 관측 지표
- `daily_publish_succeeded_count`
- `daily_publish_health_status`
- `media_generate_dlq_count`
- `provider_circuit_state` (RUNWAY/HAILUO/GEMINI_VEO/MINIMAX)
