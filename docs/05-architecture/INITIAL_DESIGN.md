# SnapVid 초기 MVP 아키텍처 설계 (INITIAL DESIGN)

> 작성일: 2026-02-11  
> 대상 마일스톤: Week 3 ("사진 1장 -> 15초 영상" E2E 파이프라인 성공률 80%)

## 1. 문제/목적/목표 정의

### 문제 (Problem)
- 현재 SnapVid는 기획 문서만 존재하고 구현 코드가 없으므로, Week 3 내 실동작 가능한 MVP 구조가 필요하다.
- 핵심 리스크는 I2V 외부 API 장애/지연, 생성 파이프라인 비용 통제 실패, E2E 품질 편차다.

### 목적 (Why)
- 4~6주 MVP 개발 내에서 가장 먼저 검증해야 할 가치인 "사진 1장으로 실사용 가능한 숏폼 영상 자동 생성"을 빠르게 증명한다.

### 목표 (What/Success)
- Week 3 종료 시점에 다음을 달성한다.
1. `image -> prompt -> i2v -> ffmpeg compose -> export` E2E 자동화 성공률 80% 이상
2. 핵심 생성 플로우 P95 90초 이내
3. 장애 시 모델 자동 전환(Fallback)으로 완전 실패율 5% 미만
4. 무료/유료 플랜별 비용 제어(쿼터+비용 가드) 동작

### 범위 (Scope)
- 포함: Backend API, 비동기 작업, 하이브리드 생성 엔진, 폴백, 쿼터/비용 제어, E2E 테스트 최소 세트
- 제외: 고급 편집기 UI, 다국어 확장, 대규모 배치 최적화, 엔터프라이즈 보안 기능

## 2. 시스템 내 위치(Context)와 영향 범위

### Context
- 입력: 상품 이미지, 스타일, 카피
- 코어 처리: 배경 제거(Remove.bg) -> I2V(1차/폴백 모델) -> FFmpeg 합성(자막/BGM/워터마크)
- 출력: 15초 MP4, 메타데이터, 생성 로그, 비용 로그

### 영향 범위
- `media` 도메인: 영상 생성 오케스트레이션, 합성, 품질 검증
- `product` 도메인: 이미지 분석 결과/상품 속성 제공
- `payment` 도메인: 플랜/크레딧/월간 한도
- 공통 인프라: 큐, 캐시, 오브젝트 스토리지, 관측성, 장애 대응

## 3. 기술 스택 확정

## 3.1 대안 비교

### Backend 프레임워크
- 후보 A: FastAPI
- 후보 B: Django Ninja

결론: **FastAPI 채택**
- 이유 1: 비동기 I/O(외부 AI API 호출 다수)와 타입 기반 스키마 정의에 유리
- 이유 2: Week 3 속도전에서 라우터/의존성 주입/문서화(OpenAPI) 생산성이 높음
- 이유 3: Celery/Redis/SQLAlchemy와 조합이 단순하고, AI 파이프라인 프로토타이핑에 적합

### Frontend 프레임워크
- 후보 A: Next.js (App Router, TypeScript)
- 후보 B: Vite + React

결론: **Next.js 채택**
- 이유 1: SSR/서버 액션/라우팅 내장으로 초기 개발 속도 유리
- 이유 2: Vercel 배포/프리뷰 환경과 궁합이 좋아 실험 반복이 빠름
- 이유 3: 타입 안정성(TypeScript)과 컴포넌트 생태계 활용이 용이

## 3.2 최종 스택 (Week 1~3 MVP 기준)

### Backend
- Language: Python 3.12
- Web: FastAPI
- Validation/Settings: Pydantic v2, pydantic-settings
- ORM: SQLAlchemy 2.x + Alembic
- Queue: Celery + Redis (작업 큐/재시도/백오프)
- HTTP Client: httpx (async)
- Media: FFmpeg (subprocess wrapper), Pillow
- Storage: S3 호환 오브젝트 스토리지
- DB: PostgreSQL 16

### Frontend
- Framework: Next.js 15 + TypeScript
- State/Data: TanStack Query
- UI: shadcn/ui + Tailwind CSS
- Forms: React Hook Form + Zod

### 운영/품질
- Observability: OpenTelemetry + Prometheus/Grafana + Sentry
- Testing:
  - Backend: pytest, pytest-asyncio
  - Frontend: Vitest, Testing Library
  - E2E: Playwright
- Dev Tooling: pnpm, ruff, mypy, eslint, prettier

## 4. 디렉토리 구조 설계 (DDD + 기능 기반 하이브리드)

```text
src/
  backend/
    app/
      main.py
      api/
        v1/
          media_router.py
          product_router.py
          payment_router.py
      domain/
        media/
          entities.py
          value_objects.py
          services.py
          ports.py
          events.py
        product/
          entities.py
          services.py
          ports.py
        payment/
          entities.py
          services.py
          ports.py
      application/
        media/
          use_cases/
            generate_video.py
            retry_generation.py
          dto.py
        product/
          use_cases/
            analyze_image.py
        payment/
          use_cases/
            check_quota.py
            reserve_cost_budget.py
      infrastructure/
        db/
          models.py
          repositories/
        queue/
          celery_app.py
          tasks/
        external/
          i2v/
            runway_provider.py
            hailuo_provider.py
          remove_bg/
            client.py
          llm/
            prompt_client.py
        media/
          ffmpeg_composer.py
        quota/
          redis_token_bucket.py
        observability/
          logging.py
          metrics.py
      shared/
        config.py
        exceptions.py
        result.py

  frontend/
    app/
      (marketing)/
      studio/
        create/page.tsx
        result/[jobId]/page.tsx
    features/
      media/
        api.ts
        hooks.ts
        components/
      product/
      payment/
    entities/
      media/
      product/
      payment/
    shared/
      ui/
      lib/
      config/
```

### 구조 원칙
- 도메인 규칙은 `domain/`에 고정하고, 외부 API 의존은 `infrastructure/`로 격리한다.
- `application/use_cases`는 도메인 조합과 트랜잭션 경계를 관리한다.
- 기능 단위(`media`, `product`, `payment`)로 수직 분할하여 팀 병렬 개발을 쉽게 만든다.

## 5. 핵심 모듈 인터페이스 설계

## 5.1 Hybrid Engine

### 목표 인터페이스
```python
async def generate_video(image: ImageRef, style: StylePreset, copy: CopySet) -> VideoResult
```

### 파이프라인 단계
1. 입력 검증/정규화(해상도, 포맷, EXIF 회전)
2. 배경 제거 (`RemoveBgPort`)
3. 프롬프트 생성 (`PromptComposer`)
4. I2V 생성 (`ModelProvider.generate_clip`) x N클립
5. FFmpeg 합성 (`ComposerPort.compose`)
6. 품질 점수 계산 및 결과 저장

### 핵심 포트(Port) 설계
```python
class RemoveBgPort(Protocol):
    async def remove_background(self, image: ImageRef) -> ForegroundAsset: ...

class I2VPort(Protocol):
    async def generate_clip(self, prompt: str, style: StylePreset, sec: int) -> ClipAsset: ...

class ComposerPort(Protocol):
    async def compose(self, clips: list[ClipAsset], overlay: ForegroundAsset, copy: CopySet) -> VideoAsset: ...
```

## 5.2 Fallback System

### 추상 인터페이스
```python
class ModelProvider(ABC):
    name: str
    priority: int
    timeout_sec: int

    @abstractmethod
    async def healthcheck(self) -> bool: ...

    @abstractmethod
    async def generate(self, request: I2VRequest) -> I2VResponse: ...
```

### 구현체
- `RunwayProvider`: 기본(유료/첫 영상 우선)
- `HailuoProvider`: 1차 폴백(무료/저비용)
- (옵션) `KlingProvider`: 2차 폴백

### 자동 전환 로직
1. 우선순위 높은 provider부터 시도
2. 실패 유형 분류: timeout / rate-limit / 5xx / invalid-response
3. 실패 카운트와 서킷 브레이커 상태 확인
4. 다음 provider로 즉시 전환
5. 전체 실패 시 작업 상태를 `DEGRADED_FAILED`로 기록하고 재시도 큐 등록

### 전환 의사코드
```python
for provider in provider_chain:
    if circuit_breaker.is_open(provider.name):
        continue
    try:
        return await provider.generate(req)
    except RetryableError as e:
        mark_failure(provider.name, e)
        continue
raise AllProvidersFailed()
```

## 5.3 Quota System (Rate Limiting + Cost Control)

### 요구사항
- 사용자/워크스페이스 단위 요청 폭주 방지
- 플랜별 월 생성량 제한
- 1건 예상 비용이 예산 상한을 초과하면 사전 차단

### 인터페이스
```python
class QuotaService(Protocol):
    async def allow_request(self, user_id: str, tokens: int = 1) -> bool: ...
    async def reserve_budget(self, user_id: str, expected_cost_usd: float) -> BudgetTicket: ...
    async def commit_usage(self, ticket: BudgetTicket, actual_cost_usd: float) -> None: ...
```

### 알고리즘
- 실시간 제한: Redis Token Bucket (`capacity`, `refill_rate`)
- 월간 한도: PostgreSQL 집계 + Redis 캐시
- 비용 제어: 실행 전 `expected_cost` 예약, 실행 후 `actual_cost` 정산

### 차단 규칙
1. Token Bucket 부족 -> HTTP 429
2. 월간 한도 초과 -> HTTP 402(업그레이드 유도)
3. 예상 비용 예산 초과 -> 작업 큐 등록 거부 + 저비용 모델 재시도 옵션 제공

## 6. 실행 설계 (Week 1~3 로드맵)

## 6.1 Week 1: 기본 생성 파이프라인
- 구현 범위
1. 이미지 업로드/API
2. 이미지 분석 -> 프롬프트 생성
3. 단일 I2V provider(Runway) 연동
4. 작업 큐(Celery) + 상태 조회 API

- 완료 기준
1. 단일 요청 E2E 성공률 50% 이상
2. 실패 로그에 원인 코드가 남음
3. 15초 생성 P95 120초 이내

## 6.2 Week 2: 합성 엔진 고도화
- 구현 범위
1. Remove.bg + FFmpeg 합성 (자막/BGM/워터마크)
2. 3클립 연결 템플릿(인트로/상품/CTA)
3. 결과물 메타데이터 저장(길이/fps/용량/비용)

- 완료 기준
1. 합성 실패율 10% 미만
2. 출력 규격(1080x1920, mp4, h264/aac) 일관성 확보
3. 기본 스타일 3개 이상 동작

## 6.3 Week 3: 폴백 + E2E 통합 + 최적화
- 구현 범위
1. Runway -> Hailuo 자동 폴백
2. Quota/Cost Guard 적용
3. E2E 시나리오 자동화(성공/타임아웃/레이트리밋/폴백 성공)
4. 성능 병목 최적화(병렬화 가능한 단계 분리)

- 완료 기준
1. 목표 성공률 80% 이상
2. 완전 실패율 5% 미만
3. p95 생성 시간 90초 이내(목표)

## 7. 검증 전략 (증거 기반)

### 테스트 시나리오(핵심)
1. 정상 경로: 이미지 1장 업로드 후 15초 영상 생성 성공
2. Runway 장애: Hailuo 자동 전환으로 성공
3. 레이트리밋: 429와 재시도 안내 확인
4. 월 한도 초과: 생성 거부 + 플랜 안내
5. FFmpeg 실패: 재시도/실패 상태 전이 검증

### 관측성 지표
- `pipeline_success_rate`
- `provider_failover_count`
- `generation_latency_p95`
- `cost_per_video_usd`
- `queue_wait_time_p95`

## 8. 리스크 및 대응

1. 외부 API SLA 변동  
대응: 폴백 체인 + 서킷 브레이커 + 지수 백오프
2. 생성 품질 편차  
대응: 스타일 프리셋 고정, 자동 QC, 저품질 자동 재시도
3. 비용 급증  
대응: 사전 비용 예약, 무료 티어 저비용 모델 강제, 월별 예산 알람

## 9. 구현 순서 요약 (의사코드)

```python
async def generate_video(image, style, copy):
    assert quota.allow_request(user_id)
    ticket = quota.reserve_budget(user_id, expected_cost(style))

    fg = await remove_bg.remove_background(image)
    prompt = prompt_builder.build(image, style, copy)
    clips = await provider_router.generate_with_failover(prompt, style)
    video = await composer.compose(clips, fg, copy)

    await quota.commit_usage(ticket, actual_cost(video))
    return video.url
```

## 10. 결론
- Week 3 목표 달성을 위해 FastAPI + Next.js 조합과 DDD 하이브리드 구조를 채택한다.
- 기술적 핵심은 `Hybrid Engine`, `Fallback System`, `Quota System` 3축이며, 이 3개를 먼저 완성하면 E2E 성공률 80% 목표를 현실적으로 달성할 수 있다.

---

## 역할 정의
- 시스템 아키텍트: 도메인 경계와 서비스/인프라 분리를 설계
- 백엔드 엔지니어: 생성 파이프라인, 폴백, 쿼터 인터페이스 구체화
- QA 엔지니어: Week 1~3 증거 기반 검증 시나리오와 완료 기준 정의
