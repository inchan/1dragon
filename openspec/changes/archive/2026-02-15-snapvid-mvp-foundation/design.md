## Context

SnapVid MVP는 "상품 사진 1장 → 숏폼 마케팅 영상 자동 생성" AI SaaS다. 현재 기획 문서만 존재하고 구현 코드는 없다. 기존 아키텍처 문서(Python/FastAPI + Next.js)에서 **TypeScript 풀스택 모노레포**로 전환하며, I2V 4-provider 체계와 AI 모델 페르소나 기능을 MVP P0으로 포함한다.

**현재 상태:** 코드 없음. docs/ 디렉토리에 리서치, 전략, PRD, 아키텍처 문서만 존재.

**제약 조건:**
- Node.js ≥20.0.0, pnpm 9.15.0+
- TypeScript strict mode, Biome, TDD 필수
- FSD 아키텍처 (entities→features 병합 간소화 버전)
- eslint-plugin-boundaries로 레이어 의존성 강제: `app → widgets → features → shared`

---

## Goals / Non-Goals

**Goals:**
- TypeScript 풀스택 모노레포 구조를 0에서 구축한다
- 12+1개 MVP 기능(F001~F012, F013-MVP)을 구현할 수 있는 아키텍처를 설계한다
- 4개 I2V 프로바이더(Runway/Hailuo/Gemini Veo/MiniMax) 폴백 체인을 추상화한다
- AI 모델 페르소나 파이프라인(프리셋 선택 → Imagen 합성 → I2V 영상화)을 설계한다
- DDD 기반 도메인 분리(media, product, payment, notification, model-persona)를 수립한다

**Non-Goals:**
- 고급 편집기 (씬 에디터, 프로 에디터) — Phase 3
- 대량 배치 처리 — Phase 3
- 엔터프라이즈 기능 (SSO, RBAC, 승인 워크플로우) — Phase 4
- Virtual Try-On 고도화 (포즈/체형 세밀 제어) — Phase 2+
- 다국어 TTS/자막 — Phase 2+

---

## Decisions

### D1. 백엔드 프레임워크: Hono

**결정:** Hono를 백엔드 프레임워크로 채택한다.

**후보:**

| 기준 | NestJS | Hono | Fastify |
|------|--------|------|---------|
| DDD 지원 | ★★★★★ 내장 모듈/DI | ★★★☆☆ 직접 구성 | ★★★☆☆ 플러그인 |
| 번들 크기 | 무거움 (~50MB) | 매우 가벼움 (~14KB) | 가벼움 |
| 성능 | 중간 | 최상 | 최상 |
| TypeScript 네이티브 | ★★★★☆ 데코레이터 기반 | ★★★★★ 타입 추론 우선 | ★★★★☆ |
| 학습 곡선 | Angular 스타일 필요 | 최소 | 최소 |
| 엣지 런타임 호환 | 제한적 | 완전 | 제한적 |

**근거:**
1. TypeScript 풀스택에서 프론트엔드(React 19/Vite)의 경량 철학과 일관된 경량 접근
2. DDD 구조는 프레임워크가 아닌 **디렉토리 구조 + 의존성 규칙**으로 강제하는 것이 프레임워크 종속 없이 더 유연함
3. Zod 기반 검증과 TypeScript 타입 추론이 프론트엔드 `packages/shared` 타입과 직접 공유 가능
4. 향후 Cloudflare Workers/Vercel Edge 등 엣지 배포 옵션 확보

**DDD 보완 전략:**
- `tsyringe` 또는 `inversify` 경량 DI 컨테이너로 포트/어댑터 주입
- 레이어 의존성은 ESLint import 규칙으로 정적 검증
- 도메인 로직은 프레임워크 무관한 순수 TypeScript 모듈로 작성

---

### D2. ORM: Drizzle ORM

**결정:** Drizzle ORM을 채택한다.

**후보:**

| 기준 | Drizzle | Prisma | TypeORM |
|------|---------|--------|---------|
| TypeScript 네이티브 | ★★★★★ | ★★★★☆ (codegen) | ★★★☆☆ (데코레이터) |
| SQL 제어 | 직접 SQL-like | 추상화된 쿼리 | 혼합 |
| 빌드 단계 | 불필요 | prisma generate 필수 | 불필요 |
| 번들 크기 | 최소 | 무거움 | 무거움 |
| 마이그레이션 | drizzle-kit | prisma migrate | 내장 |

**근거:**
1. SQL-like 쿼리 빌더로 복잡한 집계(월별 크레딧, 비용 정산)에 유리
2. TypeScript 타입이 스키마 정의에서 직접 추론되어 `packages/shared`와 타입 공유 용이
3. 별도 codegen 빌드 단계 없이 모노레포 빌드 파이프라인이 단순

---

### D3. 인증: Better Auth

**결정:** Better Auth를 채택한다.

**후보:**

| 기준 | Better Auth | Lucia | Auth.js (NextAuth) |
|------|-------------|-------|-------------------|
| 프레임워크 독립 | ★★★★★ | ★★★★★ | Next.js 최적화 |
| 소셜 로그인 | 카카오/Google/Apple 지원 | 직접 구성 | 내장 |
| TypeScript | 네이티브 | 네이티브 | ★★★★☆ |
| 세션 관리 | DB/JWT 선택 | DB 기반 | JWT/DB |
| Hono 통합 | 공식 지원 | 미들웨어 직접 구성 | 미지원 |

**근거:**
1. Hono 공식 통합 플러그인 제공
2. 카카오/Google/Apple 소셜 로그인 프로바이더 내장
3. 프레임워크 무관하여 향후 마이그레이션 리스크 최소

---

### D4. 모노레포 구조

**결정:**

```
snapvid/
├── apps/
│   ├── web/                     # React 19 + Vite + TanStack Router (프론트엔드)
│   └── api/                     # Hono (백엔드)
├── packages/
│   ├── shared/                  # 공유 타입, Zod 스키마, 유틸리티
│   ├── ui/                      # shadcn/ui 기반 공유 UI 컴포넌트
│   └── config/                  # ESLint/Biome/TypeScript 공통 설정
├── tooling/
│   ├── eslint/                  # ESLint 설정 (FSD boundaries 포함)
│   ├── typescript/              # tsconfig 베이스
│   └── biome/                   # Biome 설정
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

**근거:**
- `packages/shared`에서 API 요청/응답 Zod 스키마를 정의하면 프론트/백엔드 타입이 자동 동기화
- `packages/ui`로 디자인 시스템 컴포넌트를 분리하여 Storybook 개별 개발 가능
- `tooling/`으로 린트/빌드 설정을 중앙화하여 일관성 확보

---

### D5. 프론트엔드 FSD 아키텍처

**결정:** FSD 간소화 버전 (entities→features 병합) 적용

```
apps/web/src/
├── app/                         # FSD app 레이어: 라우터, 프로바이더, 전역 설정
│   ├── routes/                  # TanStack Router 파일 기반 라우팅
│   ├── providers/               # QueryClient, Auth, i18n, Sentry
│   └── styles/                  # 전역 스타일, Tailwind 설정
├── widgets/                     # FSD widgets: 페이지 조합 단위
│   ├── video-creator/           # 영상 생성 위저드 (F001~F003 통합)
│   ├── video-preview/           # 영상 프리뷰/재생성 (F008)
│   ├── model-selector/          # 모델 페르소나 선택 (F013-MVP)
│   └── dashboard/               # 히스토리/크레딧 대시보드
├── features/                    # FSD features: 비즈니스 로직 단위
│   ├── media/
│   │   ├── api/                 # TanStack Query hooks (queries + mutations)
│   │   ├── model/               # 타입, 비즈니스 로직, Zod 스키마
│   │   ├── ui/                  # 기능 전용 UI 컴포넌트
│   │   └── lib/                 # 유틸리티 함수
│   ├── product/
│   ├── payment/
│   ├── auth/
│   ├── model-persona/
│   └── notification/
├── shared/                      # FSD shared: 공통 유틸, UI 프리미티브
│   ├── ui/                      # Button, Input 등 (shadcn/ui 래퍼)
│   ├── lib/                     # 공용 헬퍼 (날짜, 포맷, 에러 처리)
│   ├── api/                     # API 클라이언트 설정 (fetch wrapper)
│   ├── i18n/                    # i18n 설정, 유틸
│   └── config/                  # 환경 변수, 상수
└── locales/                     # i18n 번역 파일
    ├── en/
    ├── ko/
    └── ja/
```

**레이어 의존성 규칙:**
```
app → widgets → features → shared (단방향만 허용)
```
- `features/media`는 `features/payment`를 직접 import할 수 없음 (widgets에서 조합)
- `shared`는 어떤 feature도 import할 수 없음
- eslint-plugin-boundaries로 빌드 시 정적 검증

---

### D6. 백엔드 DDD 아키텍처

**결정:** 포트/어댑터 패턴 기반 레이어드 구조

```
apps/api/src/
├── interface/                   # 인터페이스 레이어 (HTTP 입구)
│   ├── http/
│   │   ├── routes/              # Hono 라우터 (media, product, payment, webhook)
│   │   ├── middleware/          # 인증, 에러 처리, 로깅
│   │   └── sse/                 # SSE 스트림 엔드포인트
│   └── queue/                   # BullMQ 워커 (작업 소비자)
├── application/                 # 애플리케이션 레이어 (유스케이스)
│   ├── media/
│   │   ├── generate-video.usecase.ts
│   │   ├── render-variants.usecase.ts
│   │   ├── retry-generation.usecase.ts
│   │   └── stream-job-events.usecase.ts
│   ├── product/
│   │   └── analyze-image.usecase.ts
│   ├── payment/
│   │   ├── check-quota.usecase.ts
│   │   ├── manage-subscription.usecase.ts
│   │   └── handle-webhook.usecase.ts
│   ├── model-persona/
│   │   ├── select-persona.usecase.ts
│   │   └── generate-model-image.usecase.ts
│   └── notification/
│       └── dispatch-notification.usecase.ts
├── domain/                      # 도메인 레이어 (비즈니스 규칙, 프레임워크 무관)
│   ├── media/
│   │   ├── entities.ts          # VideoJob, VideoResult, VideoVariant
│   │   ├── value-objects.ts     # Platform, StylePreset, QualityScore
│   │   ├── services.ts          # VariantPolicyService
│   │   ├── ports.ts             # I2VPort, ComposerPort, RemoveBgPort
│   │   └── events.ts           # JobStatusChanged
│   ├── product/
│   │   ├── entities.ts          # ProductAnalysis
│   │   ├── ports.ts             # VisionAnalyzerPort, ImageEnhancerPort
│   │   └── services.ts
│   ├── payment/
│   │   ├── entities.ts          # Subscription, EntitlementSnapshot
│   │   ├── value-objects.ts     # PlanTier, BillingCycle
│   │   ├── ports.ts             # PaymentGatewayPort, WebhookEventStorePort
│   │   ├── policies.ts         # QuotaPolicy, WatermarkIncentivePolicy
│   │   └── events.ts           # SubscriptionChanged
│   ├── model-persona/
│   │   ├── entities.ts          # ModelPersona, PersonaPreset
│   │   ├── value-objects.ts     # Gender, AgeRange, BodyType, Style
│   │   ├── ports.ts             # ModelImageGeneratorPort
│   │   └── services.ts         # PersonaCategoryMatcher
│   └── notification/
│       ├── entities.ts          # NotificationEvent
│       ├── ports.ts             # JobStreamPort, NotificationChannelPort
│       └── events.ts
├── infrastructure/              # 인프라 레이어 (포트 구현체, 외부 연동)
│   ├── persistence/
│   │   ├── schema.ts            # Drizzle 스키마 정의
│   │   ├── migrations/
│   │   └── repositories/        # 도메인별 리포지토리 구현
│   ├── queue/
│   │   ├── bullmq.config.ts
│   │   └── workers/             # 도메인별 워커
│   ├── providers/               # 외부 AI API 어댑터
│   │   ├── i2v/
│   │   │   ├── runway.adapter.ts
│   │   │   ├── hailuo.adapter.ts
│   │   │   ├── gemini-veo.adapter.ts
│   │   │   ├── minimax.adapter.ts
│   │   │   └── provider-router.ts    # 폴백 체인 + 서킷 브레이커
│   │   ├── vision/
│   │   │   ├── claude-vision.adapter.ts
│   │   │   └── gemini-vision.adapter.ts
│   │   ├── image-gen/
│   │   │   └── gemini-imagen.adapter.ts  # 모델 페르소나 이미지 합성
│   │   ├── remove-bg/
│   │   ├── llm/                 # GPT-4o 카피라이팅
│   │   ├── tts/                 # Typecast
│   │   ├── bgm/                 # Udio
│   │   ├── stt/                 # Deepgram 자막
│   │   └── payment-gateway/     # 토스페이먼츠
│   ├── media/
│   │   ├── ffmpeg-composer.ts
│   │   └── platform-variant-renderer.ts
│   ├── notification/
│   │   ├── sse-broker.ts
│   │   └── outbox-dispatcher.ts
│   ├── storage/                 # S3 호환 스토리지
│   └── observability/           # 로깅, 메트릭, Sentry
├── shared/
│   ├── config.ts
│   ├── di-container.ts          # tsyringe DI 설정
│   ├── errors.ts
│   └── result.ts                # Result<T, E> 패턴
└── main.ts
```

**레이어 의존성 규칙:**
```
interface → application → domain ← infrastructure
```
- `domain`은 어떤 레이어도 import하지 않음 (순수 비즈니스 로직)
- `application`은 domain 포트(인터페이스)만 참조, 구현체는 DI로 주입
- `infrastructure`는 domain 포트를 구현하되, application을 직접 참조하지 않음

---

### D7. I2V 프로바이더 추상화

**결정:** Strategy 패턴 + 서킷 브레이커 + 우선순위 체인

```typescript
// domain/media/ports.ts
interface I2VPort {
  readonly name: string
  readonly priority: number
  healthcheck(): Promise<boolean>
  generateClip(request: I2VRequest): Promise<ClipAsset>
}

// infrastructure/providers/i2v/provider-router.ts
// 폴백 체인 우선순위:
// 유료 사용자: Runway → Gemini Veo → MiniMax → Hailuo
// 무료 사용자: Hailuo → MiniMax → Gemini Veo
// 첫 영상:    Runway (Best-foot-forward 고정)
```

**서킷 브레이커 정책:**
- 실패 임계값: 5회 연속 실패 → OPEN (30초 차단)
- Half-open: 1건 시범 요청 → 성공 시 CLOSED
- 메트릭: `provider_failover_count`, `circuit_breaker_state`

---

### D8. 모델 페르소나 파이프라인

**결정:** 카테고리 감지 → 프리셋 선택 → Imagen 합성 → I2V 영상화

```
[상품 이미지 업로드]
    ↓
[F001: AI 이미지 분석]
    ↓ 카테고리 = 의류/악세서리/뷰티?
    ├── Yes → [모델 페르소나 선택 UI 노출]
    │           ↓ 사용자가 프리셋 모델 선택 (성별/연령대/체형/스타일)
    │           ↓
    │         [Gemini Imagen: 모델+상품 합성 이미지 생성]
    │           ↓ 합성 이미지 → I2V 입력
    │           ↓
    │         [I2V: 모델이 상품을 착용/사용하는 영상 생성]
    │
    └── No  → [기존 플로우: 상품 중심 영상 생성]
```

**프리셋 모델 타입 (MVP):**

| 속성 | 옵션 |
|------|------|
| 성별 | 여성 / 남성 |
| 연령대 | 20대 / 30대 / 40대 |
| 체형 | 슬림 / 레귤러 |
| 스타일 | 캐주얼 / 포멀 / 스트리트 / 미니멀 |

**기술적 접근:**
1. 프리셋 조합별 Gemini Imagen 프롬프트 템플릿 사전 정의
2. 상품 이미지(배경 제거) + 모델 프롬프트를 Imagen에 전달 → 모델+상품 합성 이미지
3. 합성 이미지를 I2V 엔진 입력으로 사용 (기존 파이프라인과 동일)
4. 품질 검증: 모델-상품 일관성 점수 자동 측정

---

### D9. 큐 아키텍처

**결정:** BullMQ + Redis + Job 상태 머신

```
Job 상태 전이:
QUEUED → ANALYZING → GENERATING → COMPOSING → RENDERING_VARIANTS → SUCCEEDED
                                                                  ↘ FAILED
                                                                  ↘ DEGRADED_FAILED (폴백 후 부분 성공)
```

**큐 분리:**
- `media:analyze` — 이미지 분석 (빠름, 3초)
- `media:generate` — I2V 생성 (느림, 30~60초, 재시도 포함)
- `media:compose` — FFmpeg 합성 (중간, 10~20초)
- `media:render-variant` — 플랫폼별 변형 (중간, 5~10초)
- `notification:dispatch` — 알림 발송

---

### D10. 알림 시스템

**결정:** SSE 기본 + Polling 폴백 + Outbox 패턴

- SSE: `GET /api/v1/media/jobs/stream` — 실시간 상태 업데이트
- Polling: `GET /api/v1/media/jobs/:jobId` — SSE 미지원 환경 폴백
- Outbox: Job 상태 전이마다 DB Outbox 테이블에 이벤트 적재 → Dispatcher가 SSE 브로커로 fan-out

---

### D11. 데이터베이스 핵심 엔티티

```
users
  ├── subscriptions (1:N)
  ├── video_jobs (1:N)
  │   ├── video_variants (1:N)  — 플랫폼별 변형
  │   └── job_events (1:N)      — 상태 전이 이벤트 (Outbox)
  ├── product_analyses (1:N)
  └── model_persona_selections (1:N)

plans                             — Free/Starter 플랜 정의
platform_specs                    — TikTok/Shorts/Reels 규격
style_presets                     — 5종 영상 스타일
model_persona_presets             — 프리셋 모델 페르소나
webhook_events                    — PG 웹훅 멱등 저장소
```

---

## Risks / Trade-offs

### R1. Hono + 직접 DDD 구조 → 초기 보일러플레이트 증가
- **리스크:** NestJS 대비 DI/모듈 시스템을 직접 구성해야 하므로 초기 설정 비용 발생
- **완화:** tsyringe 경량 DI + 명확한 디렉토리 규칙 + ESLint 레이어 검증으로 일관성 확보. 프레임워크 종속 없는 도메인 로직이 장기적으로 더 유리함

### R2. Gemini Imagen 모델 페르소나 품질 편차
- **리스크:** AI 생성 모델+상품 합성 이미지가 실제 착용 사진 대비 부자연스러울 수 있음
- **완화:** 프리셋별 프롬프트 튜닝 + 품질 임계값 미달 시 "상품 중심 영상" 폴백 + 사용자에게 "모델 없이 만들기" 옵션 항상 제공

### R3. 4-provider 관리 복잡성
- **리스크:** 4개 I2V API의 입출력 포맷, 에러 코드, rate limit 정책이 모두 다름
- **완화:** Port 인터페이스 통일 + 각 어댑터에서 정규화 + 서킷 브레이커 독립 관리

### R4. Drizzle ORM 생태계 성숙도
- **리스크:** Prisma 대비 생태계/커뮤니티가 작아 특수 케이스에서 레퍼런스 부족 가능
- **완화:** SQL-like 특성상 raw SQL 폴백이 자연스러움. 복잡한 쿼리는 SQL 직접 작성 가능

### R5. FFmpeg 서버 사이드 처리 부하
- **리스크:** 영상 합성/변형 렌더링이 CPU 집중적이어서 서버 리소스 경합 발생
- **완화:** 큐 분리로 media:compose/render-variant를 별도 워커 스케일링. 장기적으로 FFmpeg 전용 워커 노드 분리 가능

### R6. 모노레포 빌드 시간 증가
- **리스크:** 패키지 수 증가에 따른 CI/CD 빌드 시간 증가
- **완화:** Turbo의 원격 캐시 + 태스크 병렬화 + 변경 영향 범위 기반 선별 빌드

---

## Open Questions

1. **백엔드 배포 타겟:** 컨테이너(Docker + K8s) vs 서버리스(Vercel/Cloudflare Workers) vs VPS? → Hono는 둘 다 지원하나 FFmpeg 의존성 때문에 컨테이너가 유력
2. **Gemini Imagen API 가용성:** 현재 Imagen 3의 상업 라이선스/가격 확정 필요 (TBD)
3. **MiniMax API와 Hailuo 관계:** MiniMax가 Hailuo의 모회사이므로 API 중복/차별화 포인트 명확화 필요
4. **모델 페르소나 프리셋 수:** MVP에서 몇 개 조합을 지원할지 (제안: 성별2 × 연령3 × 체형2 × 스타일4 = 48개 프리셋, 실제 생성은 온디맨드)
