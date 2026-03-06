# 1Dragon MVP 개정 아키텍처 설계 (REVISED DESIGN)

> 작성일: 2026-02-11  
> 기준 문서: `docs/05-architecture/INITIAL_DESIGN.md`, `docs/05-architecture/GAP_ANALYSIS_REPORT.md`  
> 대상 마일스톤: Week 3 ("사진 1장 -> 15초 영상" E2E 파이프라인 + 멀티플랫폼/알림/구독정책 핵심 반영)

## 1. 문제/목적/목표 정의

### 문제 (Problem)
- 초기 설계는 생성 엔진 안정성(Fallback/Quota)에 강점이 있으나, 제품 기능 관점의 핵심 공백 3개(F009/F003/F012)가 존재한다.
- 공백 미해결 시 Week 3 이후 구조적 재작업(도메인 엔티티/포트/API 변경) 비용이 크다.

### 목적 (Why)
- Week 3 MVP 검증 시점부터 "실사용 제품"에 필요한 최소 비즈니스 기능(멀티플랫폼 출력, 비동기 알림, 구독 생명주기)을 아키텍처에 선반영한다.

### 목표 (What/Success)
1. 단일 생성 요청으로 플랫폼 변형 결과(TikTok/Shorts/Reels)를 정책 기반으로 산출한다.
2. 60~90초 비동기 생성 작업의 결과를 SSE 중심 + Polling 폴백으로 전달한다.
3. 구독 업그레이드/갱신/만료/웹훅 처리의 금전 리스크(중복 처리, 상태 불일치)를 방지한다.
4. 기존 목표(성공률 80%, P95 90초, 완전 실패율 5% 미만, 비용 제어)를 유지한다.

### 범위 (Scope)
- 포함: Media Variant 엔진, Notification 도메인/포트, Subscription Lifecycle + PG Webhook, 관련 API/큐/저장 구조
- 제외: SNS 직접 공유(F010), 고급 에디터, 엔터프라이즈 보안 고도화

## 2. 시스템 내 위치(Context)와 영향 범위

### Context
- 입력: 상품 이미지, 스타일, 카피, 사용자 플랜/권한
- 코어 처리: 배경 제거 -> I2V + Fallback -> 마스터 합성 -> 플랫폼별 Variant 렌더 -> 저장/메타데이터
- 비동기 전달: Job 상태 이벤트 발행 -> SSE 전송(기본) / Polling(폴백) / 이메일·푸시(옵션 채널)
- 결제 처리: 구독 상태 + 정책 스냅샷 조회 -> 사용량/인센티브 반영 -> PG 웹훅으로 상태 동기화

### 영향 범위
- `media` 도메인: 단일 결과에서 다중 플랫폼 결과 구조로 확장
- `notification` 도메인(신규): 작업 이벤트와 사용자 채널 전달
- `payment` 도메인: Quota 중심에서 Subscription Lifecycle 중심으로 확장
- 인프라: Outbox, SSE 브로커, PG Webhook 검증/멱등 처리

## 3. Critical Gap 보완 설계 요약

### 3.1 F009 멀티플랫폼 출력
- 핵심 결정: "마스터 1회 렌더 + 플랫폼 Variant 후처리" 전략 채택
- 이유: I2V 재생성(플랫폼별 3회) 대비 비용/지연이 낮고, 구조 확장성이 높음
- 정책: Free는 기본 1개, Starter+는 3개(TikTok/Shorts/Reels) 동시 생성

### 3.2 F003 비동기 알림
- 핵심 결정: "SSE 기본 + Polling 폴백" (MVP에서 WebSocket 제외)
- 이유: 서버/클라이언트 구현 복잡도 대비 실시간성 확보가 좋고, LB/프록시 환경 대응이 단순
- 전달 방식: Job 상태 변경 이벤트를 Outbox로 기록 후 Notification Worker가 채널별 fan-out

### 3.3 F012 구독 생명주기
- 핵심 결정: Payment 도메인에 `SubscriptionManager`와 `EntitlementSnapshot` 도입
- 이유: Quota와 과금 정책(업그레이드, 갱신, 워터마크 인센티브, 이월 불가)을 분리/명시
- 웹훅: 서명검증 + 멱등키 + 순서역전 방지(`occurred_at`/version check)

## 4. 기술 스택 확정 (보완)

기존 스택은 유지하고 아래를 추가한다.

### Backend 추가
- SSE: FastAPI StreamingResponse 기반 이벤트 스트림
- Eventing: DB Outbox + Celery Consumer
- Payment: PG SDK/REST 클라이언트 + Webhook Signature 검증기

### 운영/품질 추가
- 메트릭: `variant_render_latency`, `notification_delivery_success_rate`, `webhook_idempotency_hit`
- 로깅 키: `job_id`, `subscription_id`, `provider_event_id`, `channel`

## 5. 디렉토리 구조 설계 (DDD + 기능 기반 하이브리드, 개정)

```text
src/
  backend/
    app/
      main.py
      api/
        v1/
          media_router.py
          media_stream_router.py
          product_router.py
          payment_router.py
          webhook_router.py
      domain/
        media/
          entities.py
          value_objects.py
          services.py
          ports.py
          events.py
        notification/
          entities.py
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
          policies.py
          events.py
      application/
        media/
          use_cases/
            generate_video.py
            render_variants.py
            retry_generation.py
            stream_job_events.py
          dto.py
        notification/
          use_cases/
            dispatch_notification.py
            mark_delivery.py
        payment/
          use_cases/
            check_quota.py
            reserve_cost_budget.py
            manage_subscription.py
            handle_webhook.py
      infrastructure/
        db/
          models.py
          repositories/
          outbox/
            publisher.py
            dispatcher.py
        queue/
          celery_app.py
          tasks/
            media_tasks.py
            notification_tasks.py
            payment_tasks.py
        external/
          i2v/
            runway_provider.py
            hailuo_provider.py
          remove_bg/
            client.py
          llm/
            prompt_client.py
          payment_gateway/
            stripe_client.py
            webhook_verifier.py
          notification/
            sse_broker.py
            email_client.py
            push_client.py
        media/
          ffmpeg_composer.py
          platform_variant_renderer.py
        quota/
          redis_token_bucket.py
        observability/
          logging.py
          metrics.py
      shared/
        config.py
        exceptions.py
        result.py
        enums.py
```

### 구조 원칙
- `media`는 생성/렌더 책임, `notification`은 전달 책임, `payment`는 권한/정산 책임으로 분리한다.
- 외부 채널(SSE/Email/Push)과 PG 연동은 모두 Port-Adapter로 격리한다.
- Job 상태/결제 상태 이벤트는 Outbox를 통해 적어도 1회 전달(at-least-once) 보장 후 소비자에서 멱등 처리한다.

## 6. 핵심 모듈 인터페이스 설계 (개정)

## 6.1 Hybrid Engine + Multi-Platform Variant (F009)

### 도메인 데이터 구조
```python
from dataclasses import dataclass
from enum import Enum

class Platform(str, Enum):
    TIKTOK = "tiktok"
    YOUTUBE_SHORTS = "youtube_shorts"
    INSTAGRAM_REELS = "instagram_reels"

@dataclass(frozen=True)
class PlatformSpec:
    width: int
    height: int
    max_duration_sec: int
    safe_zone_ratio: float
    watermark_required: bool

@dataclass(frozen=True)
class VideoAsset:
    url: str
    duration_sec: int
    codec: str
    width: int
    height: int

@dataclass(frozen=True)
class VideoVariant:
    platform: Platform
    asset: VideoAsset
    render_profile: str

@dataclass(frozen=True)
class VideoResult:
    job_id: str
    master: VideoAsset
    variants: dict[Platform, VideoVariant]
    qc_score: float
```

### 서비스/포트
```python
from typing import Protocol

class VariantPolicyService(Protocol):
    async def resolve_targets(self, user_id: str, plan_id: str) -> list[Platform]: ...

class PlatformSpecPort(Protocol):
    async def get_spec(self, platform: Platform) -> PlatformSpec: ...

class ComposerPort(Protocol):
    async def compose_master(
        self,
        clips: list["ClipAsset"],
        overlay: "ForegroundAsset",
        copy: "CopySet",
    ) -> VideoAsset: ...

class VariantRendererPort(Protocol):
    async def render_variant(
        self,
        master: VideoAsset,
        platform: Platform,
        spec: PlatformSpec,
    ) -> VideoVariant: ...
```

### 애플리케이션 인터페이스
```python
async def generate_video(
    image: "ImageRef",
    style: "StylePreset",
    copy: "CopySet",
    user_id: str,
    plan_id: str,
) -> VideoResult:
    ...
```

### 변형 생성 의사코드
```python
targets = await variant_policy.resolve_targets(user_id, plan_id)
master = await composer.compose_master(clips, fg, copy)

variants = {}
for platform in targets:  # MVP: 순차, Week3 후반 병렬화 가능
    spec = await platform_spec_port.get_spec(platform)
    variants[platform] = await variant_renderer.render_variant(master, platform, spec)

return VideoResult(job_id=job_id, master=master, variants=variants, qc_score=qc)
```

## 6.2 비동기 알림/결과 전달 (F003)

### 결정: SSE 기본 + Polling 폴백
- 기본: `GET /api/v1/media/jobs/stream` (SSE)
- 폴백: `GET /api/v1/media/jobs/{job_id}` 상태 조회
- 채널 확장: 이메일/푸시는 비동기 fan-out 채널로 유지

### 도메인/포트
```python
from dataclasses import dataclass
from enum import Enum

class JobStatus(str, Enum):
    QUEUED = "queued"
    RUNNING = "running"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    DEGRADED_FAILED = "degraded_failed"

class NotificationChannel(str, Enum):
    IN_APP = "in_app"
    EMAIL = "email"
    PUSH = "push"

@dataclass(frozen=True)
class JobStatusChanged:
    job_id: str
    user_id: str
    status: JobStatus
    progress: int
    occurred_at: str

class JobEventPublisherPort(Protocol):
    async def publish(self, event: JobStatusChanged) -> None: ...

class NotificationPort(Protocol):
    async def send(self, user_id: str, channel: NotificationChannel, payload: dict) -> str: ...

class JobStreamPort(Protocol):
    async def subscribe(self, user_id: str, last_event_id: str | None = None): ...
```

### 흐름
1. Media Worker가 상태 전이마다 `JobStatusChanged`를 Outbox에 적재
2. Notification Dispatcher가 Outbox 소비 후 SSE 브로커 + 채널 어댑터로 전달
3. SSE 미연결/중단 시 클라이언트는 Polling으로 동일 상태 복원
4. Rate Limit 대기 상태(`QUEUED` + ETA)도 동일 이벤트 모델로 통합

## 6.3 Subscription Lifecycle + Webhook (F012)

### 도메인 데이터 구조
```python
from dataclasses import dataclass
from enum import Enum
from datetime import datetime

class SubscriptionStatus(str, Enum):
    TRIALING = "trialing"
    ACTIVE = "active"
    PAST_DUE = "past_due"
    CANCELED = "canceled"
    EXPIRED = "expired"

class BillingCycle(str, Enum):
    MONTHLY = "monthly"
    YEARLY = "yearly"

@dataclass(frozen=True)
class EntitlementSnapshot:
    plan_id: str
    monthly_quota: int
    watermark_bonus_quota: int
    multi_platform_enabled: bool
    rollover_allowed: bool

@dataclass
class Subscription:
    subscription_id: str
    user_id: str
    status: SubscriptionStatus
    cycle: BillingCycle
    current_period_start: datetime
    current_period_end: datetime
    entitlement: EntitlementSnapshot
    version: int
```

### 서비스/포트
```python
from typing import Protocol

class SubscriptionManager(Protocol):
    async def upgrade_plan(self, user_id: str, target_plan_id: str) -> Subscription: ...
    async def renew(self, subscription_id: str) -> Subscription: ...
    async def expire(self, subscription_id: str, reason: str) -> Subscription: ...
    async def apply_watermark_incentive(self, user_id: str, month_key: str) -> int: ...

class PaymentGatewayPort(Protocol):
    async def verify_webhook(self, raw_body: bytes, signature: str) -> bool: ...
    async def parse_event(self, raw_body: bytes) -> "GatewayEvent": ...

class WebhookEventStorePort(Protocol):
    async def is_processed(self, event_id: str) -> bool: ...
    async def mark_processed(self, event_id: str) -> None: ...
```

### 웹훅 처리 의사코드
```python
async def handle_webhook(raw_body: bytes, signature: str) -> None:
    assert await gateway.verify_webhook(raw_body, signature)
    event = await gateway.parse_event(raw_body)

    if await webhook_store.is_processed(event.id):
        return  # 멱등 처리

    await subscription_service.apply_gateway_event(event)
    await webhook_store.mark_processed(event.id)
```

### 핵심 정책
- 업그레이드: 즉시 권한 상향, 과금 차액은 PG 정책(일할 계산)에 위임
- 갱신: `current_period` 갱신 시 잔여 크레딧 이월 없음(`rollover_allowed=False`)
- 워터마크 인센티브: 월별 최대 5건 추가 무료를 `watermark_bonus_quota`로 별도 ledger 관리
- 실패 결제: `PAST_DUE` 전환 후 유예기간 초과 시 `EXPIRED`

## 7. Key Module Interfaces (최종 목록)

```python
# media
class VariantPolicyService(Protocol): ...
class PlatformSpecPort(Protocol): ...
class ComposerPort(Protocol): ...            # compose_master
class VariantRendererPort(Protocol): ...     # render_variant

# notification
class JobEventPublisherPort(Protocol): ...
class JobStreamPort(Protocol): ...           # SSE
class NotificationPort(Protocol): ...        # in-app/email/push

# payment
class SubscriptionManager(Protocol): ...
class PaymentGatewayPort(Protocol): ...
class WebhookEventStorePort(Protocol): ...

# quota (기존 유지, entitlement 연동)
class QuotaService(Protocol):
    async def allow_request(self, user_id: str, tokens: int = 1) -> bool: ...
    async def reserve_budget(self, user_id: str, expected_cost_usd: float) -> "BudgetTicket": ...
    async def commit_usage(self, ticket: "BudgetTicket", actual_cost_usd: float) -> None: ...
```

## 8. 실행 설계 (Week 1~3 로드맵, 개정)

## 8.1 Week 1: 기본 생성 파이프라인 + 상태 모델 확정
- 구현 범위
1. 이미지 업로드/API + 단일 provider 생성 파이프라인
2. Job 상태 전이 모델(`QUEUED/RUNNING/SUCCEEDED/FAILED`) 및 Outbox 스키마 도입
3. Polling 상태 조회 API(`GET /jobs/{job_id}`)

- 완료 기준
1. 단일 요청 E2E 성공률 50% 이상
2. 상태 전이 로그/Outbox 이벤트가 일관되게 적재
3. 15초 생성 P95 120초 이내

## 8.2 Week 2: 합성 엔진 + 플랫폼 Variant 기초
- 구현 범위
1. Remove.bg + FFmpeg 마스터 합성
2. `PlatformSpec`/`VariantRenderer` 구현(우선 2개 플랫폼)
3. Starter 플랜 대상 멀티플랫폼 권한 체크 연결

- 완료 기준
1. 합성 실패율 10% 미만
2. 최소 2개 플랫폼 Variant 산출 성공
3. 결과 메타데이터(플랫폼별 길이/규격/비용) 저장

## 8.3 Week 3: 폴백 + 알림 + 구독 생명주기 통합
- 구현 범위
1. Runway -> Hailuo 자동 폴백 완성
2. 3개 플랫폼 Variant 완성(TikTok/Shorts/Reels)
3. SSE 스트림 API + Notification Dispatcher(in-app 우선)
4. `SubscriptionManager` + PG Webhook 멱등 처리 + 워터마크 인센티브 반영

- 완료 기준
1. 목표 성공률 80% 이상
2. 완전 실패율 5% 미만
3. p95 생성 시간 90초 이내
4. 웹훅 중복 수신 시 상태 불일치/이중 처리 0건

## 9. 검증 전략 (증거 기반)

### 핵심 시나리오
1. Starter 사용자 생성 요청 시 3개 플랫폼 Variant 모두 반환
2. Free 사용자 생성 요청 시 기본 1개 Variant만 반환
3. 장시간 작업 중 SSE로 상태 업데이트 수신, SSE 단절 시 Polling으로 복원
4. PG 웹훅 동일 이벤트 2회 수신 시 1회만 반영(멱등)
5. 결제 실패 후 `PAST_DUE -> EXPIRED` 전이와 권한 축소 반영
6. 워터마크 포함 생성 시 월 인센티브 한도(최대 5건) 초과 방지

### 관측성 지표
- `pipeline_success_rate`
- `provider_failover_count`
- `generation_latency_p95`
- `variant_render_latency_p95`
- `notification_delivery_success_rate`
- `webhook_idempotency_hit`
- `subscription_state_mismatch_count`

## 10. 리스크 및 대응

1. Variant 렌더로 인한 지연 증가  
대응: 마스터 렌더 재사용, 플랫폼별 후처리 병렬화 옵션, 우선순위 큐 분리

2. SSE 연결 품질 편차  
대응: Last-Event-ID 재연결, Polling 폴백, 이벤트 TTL 캐시

3. 결제 이벤트 순서 역전/중복  
대응: 서명검증 + 멱등 저장소 + 구독 엔티티 version check

## 11. 구현 순서 요약 (의사코드)

```python
async def generate_video(image, style, copy, user_id):
    sub = await subscription_service.get_active_subscription(user_id)
    assert await quota.allow_request(user_id)
    ticket = await quota.reserve_budget(user_id, expected_cost(style, sub.entitlement))

    fg = await remove_bg.remove_background(image)
    prompt = prompt_builder.build(image, style, copy)
    clips = await provider_router.generate_with_failover(prompt, style)

    master = await composer.compose_master(clips, fg, copy)
    targets = await variant_policy.resolve_targets(user_id, sub.entitlement.plan_id)
    variants = await variant_renderer.render_many(master, targets)

    result = VideoResult(job_id=job_id, master=master, variants=variants, qc_score=qc(master))
    await quota.commit_usage(ticket, actual_cost(result))
    await job_event_publisher.publish(JobStatusChanged.succeeded(job_id, user_id))
    return result
```

## 12. 결론
- 기존 초기 설계의 강점(Hybrid Engine/Fallback/Quota)은 유지한다.
- Critical Gap 3개(F009/F003/F012)를 DDD 경계 내에서 `media`, `notification`, `payment`로 분리 반영해 재작업 리스크를 줄인다.
- 본 개정안은 Week 3 MVP 검증에 필요한 제품 기능을 아키텍처 수준에서 즉시 구현 가능하도록 정렬한다.

---

## 역할 정의
- 시스템 아키텍트: 도메인 경계 재정의, 이벤트/포트 계약 설계, 진화 가능한 구조 보장
- 백엔드 엔지니어: Variant 렌더링, SSE 알림, Webhook 멱등 처리 구현
- 결제/구독 도메인 엔지니어: 구독 생명주기 및 권한 스냅샷 정책 일관성 확보
- QA 엔지니어: 멀티플랫폼/알림/구독 시나리오의 증거 기반 E2E 검증
