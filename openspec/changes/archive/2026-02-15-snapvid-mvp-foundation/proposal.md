## Why

1Dragon는 "상품 사진 1장 → 15~30초 숏폼 마케팅 영상 자동 생성" AI SaaS 서비스로, 현재 기획 문서(리서치/전략/PRD/아키텍처)만 존재하고 구현 코드가 없다. MVP 12개 기능(F001~F012)의 핵심 가설("60초 이내 영상 생성 → 셀러 콘텐츠 제작 빈도 3배 증가")을 검증하기 위해 프로젝트 기반부터 전체 MVP를 구축해야 한다.

기존 아키텍처 문서는 Python(FastAPI) + Next.js 기반이나, **TypeScript 풀스택 모노레포**(React 19 + Vite + TanStack Router)로 전환하고, I2V 엔진을 **4개 프로바이더(Runway/Hailuo/Gemini/MiniMax)** 체계로 확장한다. 또한 패션/뷰티 카테고리의 영상 품질을 높이기 위해 **AI 모델 페르소나 선택 기능**(프리셋 → AI 생성 단계적 확장)을 MVP P0으로 추가한다.

## What Changes

### 프로젝트 기반
- Turbo + pnpm workspace 모노레포 구조 신규 생성
- TypeScript strict mode, Biome, Vitest, Playwright 품질 도구 체인 구성
- FSD(Feature-Sliced Design) 아키텍처 적용 (entities를 features에 병합한 간소화 버전)
- i18n 3개 언어(en/ko/ja) 기반 구조 설정
- CI/CD 파이프라인 구축

### 프론트엔드 (기존 Next.js → 변경)
- **BREAKING**: Next.js 대신 React 19 + Vite + TanStack Router/Query 채택
- UI: Tailwind CSS + shadcn/ui + Radix UI + Ant Design
- 모니터링: Sentry 연동

### 백엔드 (기존 Python/FastAPI → 변경)
- **BREAKING**: Python(FastAPI/Celery) 대신 TypeScript 백엔드 채택
- DDD 기반 도메인 분리 (media, product, payment, notification)
- 비동기 작업 큐 (BullMQ + Redis)
- PostgreSQL + ORM
- SSE 기반 실시간 알림 + Polling 폴백

### AI 영상 생성 엔진 (확장)
- Runway Gen-4 Turbo (메인 유료 엔진) — 유지
- Hailuo 02 (1차 폴백/무료 티어) — 유지
- **Google Gemini API** — 추가
  - **Veo**: 영상 생성 (Image-to-Video)
  - **Imagen**: 이미지 생성/편집 (배경 생성, 상품 이미지 변형, 스타일 트랜스퍼)
  - **Gemini Vision**: 이미지 분석 (Claude Vision 폴백/보완)
- **MiniMax API** (영상 생성) — 추가
- 4개 프로바이더 서킷 브레이커 + 폴백 체인

### AI 모델 페르소나 (신규 — MVP P0)
- **F013-MVP: 모델 페르소나 선택** — 패션/뷰티/악세서리 카테고리에서 상품을 착용/사용하는 AI 인물 모델 생성
  - MVP: 프리셋 모델 페르소나 (성별, 연령대, 체형, 스타일) 중 선택 → Gemini Imagen으로 모델+상품 합성 이미지 생성 → I2V 엔진으로 영상화
  - Phase 2+: AI 커스텀 모델 생성 (얼굴/체형/포즈 세밀 제어), Virtual Try-On 고도화
- 카테고리 자동 감지: 의류/악세서리/뷰티 카테고리 시 모델 선택 UI 자동 노출, 기타 카테고리는 기존 상품 중심 플로우 유지

### 핵심 기능 (MVP F001~F012 + F013-MVP)
- F001: 이미지 업로드 & AI 분석 (Claude Vision + Gemini Vision 듀얼) + Imagen 기반 이미지 변형/배경 생성
- F002: AI 영상 스타일 선택 (5종)
- F003: 하이브리드 영상 생성 엔진 (배경 제거 → I2V 4프로바이더 → FFmpeg 합성)
- F004: 카피라이팅 자동 생성 (GPT-4o)
- F005: 배경음악 자동 선택 (Udio + 로열티 프리 라이브러리)
- F006: 음성 내레이션 TTS (Typecast)
- F007: 자막 자동 생성 (Deepgram)
- F008: 영상 프리뷰 & 재생성
- F009: 멀티플랫폼 내보내기 (TikTok/Shorts/Reels)
- F010: SNS 직접 공유
- F011: 사용자 계정 관리 (카카오/Google/Apple 소셜 로그인)
- F012: 구독 & 결제 (Free/Starter 2-tier, 토스페이먼츠)
- F013-MVP: 모델 페르소나 선택 (프리셋 모델 → Imagen 합성 → I2V 영상화)

## Capabilities

### New Capabilities

- `project-setup`: 모노레포 구조, 빌드/린트/테스트 도구 체인, CI/CD, 공통 설정, FSD 아키텍처 기반
- `image-analysis`: 상품 이미지 업로드, 검증, 배경 제거, AI 분석(카테고리/키워드/분위기), 업스케일링, **Imagen 기반 이미지 변형/배경 생성** (F001)
- `video-generation`: AI 영상 스타일 선택 + 하이브리드 엔진(4-provider I2V + FFmpeg 합성) + 프롬프트 생성 + 폴백/서킷 브레이커 (F002, F003)
- `content-generation`: 마케팅 카피 자동 생성 + BGM 자동 매칭 + TTS 내레이션 + 자막 생성 및 동기화 (F004, F005, F006, F007)
- `video-output`: 영상 프리뷰/재생성 + 멀티플랫폼 변형 렌더링 + SNS 직접 공유 (F008, F009, F010)
- `user-management`: 소셜 로그인(카카오/Google/Apple), 프로필, 온보딩, 생성 히스토리, 세션 관리 (F011)
- `billing`: Freemium 구독 체계(Free/Starter), 크레딧/쿼터 관리, 토스페이먼츠 결제, 웹훅 멱등 처리, 워터마크 인센티브 (F012)
- `model-persona`: AI 모델 페르소나 선택 (프리셋 모델 타입, 성별/연령/체형/스타일), Imagen 기반 모델+상품 합성 이미지 생성, 카테고리별 자동 노출 정책, Phase 2+ AI 커스텀 모델 확장 (F013-MVP)
- `notification`: 비동기 작업 상태 알림 (SSE + Polling 폴백), Job 이벤트 Outbox 패턴

### Modified Capabilities

(기존 스펙 없음 — 신규 프로젝트)

## Impact

### 코드
- 프로젝트 전체 신규 생성 (기존 구현 코드 없음)
- 모노레포: `apps/web` (프론트엔드), `apps/api` (백엔드), `packages/shared` (공유 타입/유틸)

### 외부 API 의존성
| 서비스 | 역할 | 비용/건 |
|--------|------|---------|
| Runway Gen-4 Turbo | I2V 메인 (유료) | $0.50 |
| Hailuo 02 | I2V 폴백 (무료 티어) | $0.28 |
| Google Gemini Veo | I2V 영상 생성 | TBD |
| Google Gemini Imagen | 이미지 생성/편집/변형 | TBD |
| Google Gemini Vision | 이미지 분석 (폴백) | TBD |
| MiniMax API | I2V 추가 엔진 | TBD |
| Claude Vision | 이미지 분석 | $0.005 |
| Remove.bg | 배경 제거 | $0.20 |
| GPT-4o | 카피라이팅 | $0.01 |
| Typecast | TTS | $0.10 |
| Udio | BGM 생성 | $0.10 |
| Deepgram | 자막 생성 | $0.01 |

### 인프라
- PostgreSQL, Redis, S3 호환 스토리지, CDN
- BullMQ 작업 큐, SSE 브로커
- Sentry, OpenTelemetry

### 기술 스택 (확정)
- **Monorepo**: Turbo + pnpm 9.15.0+, Node.js ≥20.0.0
- **Frontend**: React 19, TypeScript, TanStack Router/Query, Vite
- **UI**: Tailwind CSS, shadcn/ui, Radix UI, Ant Design
- **Backend**: TypeScript (프레임워크는 design 단계에서 확정 — NestJS/Hono/Fastify 후보)
- **Testing**: Vitest (unit), Playwright (E2E)
- **Code Quality**: Biome, TypeScript strict mode
- **Architecture**: FSD (Feature-Sliced Design, entities→features 병합)
- **TDD**: Red-Green-Refactor 필수, 비즈니스 로직 100% 테스트 커버리지
