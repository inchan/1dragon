## 1. Project Setup — 모노레포 기반 구축

- [x] 1.1 `[LOW]` pnpm workspace + Turbo 모노레포 초기화 (pnpm-workspace.yaml, turbo.json, root package.json with engines 제약)
- [x] 1.2 `[LOW]` `apps/web` 패키지 생성 — React 19 + Vite + TypeScript 초기 설정
- [x] 1.3 `[LOW]` `apps/api` 패키지 생성 — Hono + TypeScript 초기 설정
- [x] 1.4 `[LOW]` `packages/shared` 패키지 생성 — 공유 타입/Zod 스키마 구조
- [x] 1.5 `[LOW]` `packages/ui` 패키지 생성 — shadcn/ui + Tailwind CSS 초기 설정
- [x] 1.6 `[LOW]` `packages/config` 패키지 생성 — 공통 설정 모듈
- [x] 1.7 `[LOW]` `tooling/typescript` — base tsconfig (strict: true, noUncheckedIndexedAccess, exactOptionalPropertyTypes)
- [x] 1.8 `[LOW]` `tooling/biome` — 공유 Biome 설정 (single quotes, PascalCase types, UPPER_CASE enums)
- [x] 1.9 `[MED]` `tooling/eslint` — ESLint + eslint-plugin-boundaries 설정 (FSD 레이어 규칙: app→widgets→features→shared, cross-feature 차단)
- [x] 1.10 `[LOW]` Vitest 설정 — 모든 패키지에 vitest.config.ts, 커버리지 임계값 설정 (model/lib/api 100%)
- [x] 1.11 `[MED]` Playwright 설정 — `apps/web/e2e/` 구조, playwright.config.ts, CI용 headless 설정
- [x] 1.12 `[LOW]` i18n 기반 구조 — `apps/web/src/locales/{en,ko,ja}/` 디렉토리, i18n 라이브러리 설정, 누락 키 검사 스크립트
- [x] 1.13 `[MED]` GitHub Actions CI 파이프라인 — type check → lint → format → test → build → E2E (PR only) 워크플로우
- [x] 1.14 `[LOW]` Sentry 통합 — apps/web과 apps/api에 Sentry SDK 설정, 소스맵 업로드, 환경 태깅
- [x] 1.15 `[LOW]` Turbo 원격 캐시 설정 — CI 빌드 속도 최적화

## 2. Shared 패키지 — API 스키마 및 공통 타입

- [x] 2.1 `[LOW]` 공통 에러 타입 정의 (AppError, ValidationError, ApiError)
- [x] 2.2 `[LOW]` Result<T, E> 유틸리티 타입 정의
- [x] 2.3 `[LOW]` 공통 Enum 정의 — Platform, StylePreset, ProductCategory, Mood, JobStatus, SubscriptionStatus
- [x] 2.4 `[MED]` API 요청/응답 Zod 스키마 정의 — media, product, payment, notification 도메인별 스키마
- [x] 2.5 `[LOW]` 공유 유틸리티 — 날짜 포맷, 가격 포맷, 파일 크기 포맷

## 3. Backend 기반 — Hono + DDD 구조

- [x] 3.1 `[MED]` Hono 앱 초기화 — 미들웨어 체인 (CORS, 로깅, 에러 핸들링, 인증)
- [x] 3.2 `[MED]` tsyringe DI 컨테이너 설정 — 포트/어댑터 바인딩 구조
- [x] 3.3 `[MED]` Drizzle ORM 설정 — PostgreSQL 연결, 스키마 정의 파일 구조, drizzle-kit 마이그레이션 설정
- [x] 3.4 `[MED]` 핵심 DB 스키마 정의 — users, plans, subscriptions, video_jobs, video_variants, job_events, product_analyses, model_persona_presets, model_persona_selections, platform_specs, style_presets, webhook_events 테이블
- [x] 3.5 `[LOW]` BullMQ 설정 — Redis 연결, 큐 정의 (media:analyze, media:generate, media:compose, media:render-variant, notification:dispatch)
- [x] 3.6 `[LOW]` S3 호환 스토리지 클라이언트 설정 — 이미지/영상 업로드/다운로드 유틸
- [x] 3.7 `[LOW]` 환경 변수 관리 — Zod 기반 env 검증 (모든 API 키, DB URL, Redis URL 등)
- [x] 3.8 `[LOW]` 공통 로깅 설정 — 구조화 로그 (job_id, user_id, provider 태깅)

## 4. User Management — 인증 및 계정

- [x] 4.1 `[MED]` Better Auth 설정 — Hono 통합 플러그인, DB 세션 저장소
- [x] 4.2 `[MED]` 카카오 소셜 로그인 OAuth 프로바이더 연동
- [x] 4.3 `[LOW]` Google 소셜 로그인 OAuth 프로바이더 연동
- [x] 4.4 `[LOW]` Apple 소셜 로그인 OAuth 프로바이더 연동
- [x] 4.5 `[MED]` 동일 이메일 다중 프로바이더 계정 연결 로직
- [x] 4.6 `[LOW]` 세션 관리 — 액세스 토큰(15분)/리프레시 토큰(30일) 자동 갱신 미들웨어
- [x] 4.7 `[LOW]` 사용자 프로필 CRUD API — GET/PATCH /api/v1/users/me
- [x] 4.8 `[LOW]` 온보딩 설문 API — POST /api/v1/users/me/onboarding (business_name, selling_platform, product_category)
- [x] 4.9 `[MED]` 계정 삭제 API — DELETE /api/v1/users/me (30일 유예 기간 로직, 스케줄러로 영구 삭제)
- [x] 4.10 `[LOW]` 프론트엔드: 로그인 페이지 — 카카오/Google/Apple 소셜 로그인 버튼
- [x] 4.11 `[LOW]` 프론트엔드: 온보딩 위저드 UI (3단계, 건너뛰기 가능)
- [x] 4.12 `[LOW]` 프론트엔드: 프로필 설정 페이지
- [x] 4.13 `[LOW]` 프론트엔드: Auth 프로바이더 — TanStack Query + Better Auth 클라이언트 통합

## 5. Billing — 구독 및 결제

- [x] 5.1 `[LOW]` plans 테이블 시드 데이터 — Free/Starter 플랜 정의 (quota, limits, features)
- [x] 5.2 `[MED]` domain/payment — Subscription 엔티티, EntitlementSnapshot VO, SubscriptionStatus 상태 머신
- [x] 5.3 `[MED]` domain/payment/policies — QuotaPolicy (크레딧 차감/검증), WatermarkIncentivePolicy (월 최대 5건 보너스)
- [x] 5.4 `[HIGH]` application/payment — ManageSubscription 유스케이스 (업그레이드/갱신/만료/취소 전이, 이월 불가 정책)
- [x] 5.5 `[MED]` application/payment — CheckQuota 유스케이스 (크레딧 잔여 확인, 비용 예산 검증)
- [x] 5.6 `[HIGH]` 토스페이먼츠 SDK 연동 — 결제 요청/승인/취소 API 클라이언트
- [x] 5.7 `[HIGH]` 토스페이먼츠 웹훅 핸들러 — 서명 검증, 멱등 처리 (webhook_events 테이블), 순서 역전 방지 (version check)
- [x] 5.8 `[MED]` 72시간 리밋 오퍼 로직 — 무료 크레딧 소진 감지 → 할인 오퍼 타이머
- [x] 5.9 `[MED]` 결제 실패 자동 재시도 — 3일간 3회 재시도, PAST_DUE→EXPIRED 전이 스케줄러
- [x] 5.10 `[MED]` 7일 환불 API — POST /api/v1/payments/refund (기간 검증 + 토스페이먼츠 환불 호출)
- [x] 5.11 `[LOW]` 프론트엔드: 구독 플랜 선택 페이지 (Free/Starter 비교 카드, 월간/연간 토글)
- [x] 5.12 `[MED]` 프론트엔드: 토스페이먼츠 결제 위젯 연동 (카카오페이/토스페이/신용카드)
- [x] 5.13 `[LOW]` 프론트엔드: 크레딧 잔여 표시 컴포넌트 (헤더에 "이번 달 N/M건 사용")
- [x] 5.14 `[LOW]` 프론트엔드: 구독 관리 페이지 (현재 플랜, 다음 결제일, 취소 버튼)

## 6. Notification — SSE 알림 시스템

- [x] 6.1 `[MED]` domain/notification — JobStatusChanged 이벤트, NotificationEvent 엔티티, 이벤트 스키마 정의
- [x] 6.2 `[HIGH]` infrastructure/notification — SSE 브로커 구현 (연결 관리, 하트비트 30초, 최대 1시간, Last-Event-ID 재연결)
- [x] 6.3 `[MED]` infrastructure/notification — Outbox 디스패처 (job_events 테이블 폴링 → SSE 브로커 전달, 중복 제거)
- [x] 6.4 `[LOW]` interface/http/sse — GET /api/v1/media/jobs/stream SSE 엔드포인트
- [x] 6.5 `[LOW]` interface/http/routes — GET /api/v1/media/jobs/:jobId 폴링 엔드포인트
- [x] 6.6 `[MED]` 프론트엔드: SSE 클라이언트 훅 (useJobStream) — 연결/재연결/폴백 로직, TanStack Query 캐시 업데이트 통합

## 7. Image Analysis — 이미지 업로드 및 분석

- [x] 7.1 `[MED]` interface/http/routes — POST /api/v1/products/analyze (멀티파트 이미지 업로드, Zod 검증)
- [x] 7.2 `[LOW]` domain/product — ProductAnalysis 엔티티, 카테고리/분위기/키워드 VO
- [x] 7.3 `[LOW]` domain/product/ports — VisionAnalyzerPort, RemoveBgPort, ImageEnhancerPort, ImageGeneratorPort 인터페이스
- [x] 7.4 `[MED]` infrastructure/providers/vision — Claude Vision 어댑터 (이미지→구조화 분석 결과)
- [x] 7.5 `[MED]` infrastructure/providers/vision — Gemini Vision 어댑터 (Claude 폴백용)
- [x] 7.6 `[MED]` infrastructure/providers/remove-bg — Remove.bg 어댑터 (배경 제거, 투명 배경 감지)
- [x] 7.7 `[MED]` infrastructure/providers/image-gen — Real-ESRGAN 업스케일러 (720px 미만 자동 트리거)
- [x] 7.8 `[MED]` infrastructure/providers/image-gen — Gemini Imagen 어댑터 (배경 생성, 스타일 트랜스퍼)
- [x] 7.9 `[MED]` application/product — AnalyzeImage 유스케이스 (검증→업스케일→분석→배경 제거 오케스트레이션)
- [x] 7.10 `[LOW]` 이미지 검증 로직 — 포맷(JPEG/PNG/WebP), 크기(≤20MB), 해상도(≥720px), EXIF 회전 보정
- [x] 7.11 `[LOW]` 비상품 이미지 감지 — Vision API 응답에서 상품 여부 판별, 경고 반환
- [x] 7.12 `[LOW]` product_analyses 리포지토리 — CRUD + 사용자별 히스토리 조회
- [x] 7.13 `[LOW]` 프론트엔드: 이미지 업로드 컴포넌트 (드래그앤드롭, 미리보기, 진행률)
- [x] 7.14 `[LOW]` 프론트엔드: 분석 결과 표시 UI (카테고리, 키워드, 분위기 카드)

## 8. Model Persona — AI 모델 페르소나

- [x] 8.1 `[LOW]` domain/model-persona — ModelPersona, PersonaPreset 엔티티, Gender/AgeRange/BodyType/Style VO
- [x] 8.2 `[LOW]` domain/model-persona/ports — ModelImageGeneratorPort 인터페이스
- [x] 8.3 `[MED]` domain/model-persona/services — PersonaCategoryMatcher (의류/악세서리/뷰티 카테고리 감지→모델 UI 트리거)
- [x] 8.4 `[LOW]` model_persona_presets 시드 데이터 — 48개 프리셋 조합 + Imagen 프롬프트 템플릿
- [x] 8.5 `[HIGH]` infrastructure/providers/image-gen — Gemini Imagen 모델+상품 합성 어댑터 (프롬프트 템플릿 보간, 합성 이미지 생성)
- [x] 8.6 `[MED]` application/model-persona — SelectPersona 유스케이스 (프리셋 조회, 추천 3개 계산)
- [x] 8.7 `[HIGH]` application/model-persona — GenerateModelImage 유스케이스 (Imagen 호출→품질 검증→재시도→폴백)
- [x] 8.8 `[MED]` 모델+상품 합성 품질 검증 로직 — 가시성/자연스러움/아티팩트 점수 측정, <60% 시 재생성
- [x] 8.9 `[LOW]` model_persona_selections 리포지토리 — 선택 내역 저장, video_job 연관
- [x] 8.10 `[MED]` 프론트엔드: 모델 페르소나 선택 위젯 — 성별/연령/체형/스타일 셀렉터, 추천 3개 하이라이트, "모델 없이 만들기" 옵션
- [x] 8.11 `[LOW]` 프론트엔드: 합성 이미지 미리보기 — 로딩 상태, 결과 표시, 재생성 버튼

## 9. Video Generation — I2V 엔진 코어

- [x] 9.1 `[LOW]` domain/media — VideoJob, VideoResult, VideoVariant 엔티티, ClipAsset/VideoAsset VO
- [x] 9.2 `[LOW]` domain/media/value-objects — Platform, StylePreset, QualityScore, JobStatus 정의
- [x] 9.3 `[LOW]` domain/media/ports — I2VPort, ComposerPort, RemoveBgPort, PromptBuilderPort 인터페이스
- [x] 9.4 `[MED]` domain/media/events — JobStatusChanged 이벤트 + 상태 머신 (QUEUED→ANALYZING→GENERATING→COMPOSING→RENDERING_VARIANTS→SUCCEEDED/FAILED)
- [x] 9.5 `[LOW]` domain/media/services — VariantPolicyService (플랜별 플랫폼 변형 결정: Free=1개, Starter=3개)
- [x] 9.6 `[LOW]` style_presets 시드 데이터 — 5종 스타일 (심플/다이내믹/감성/트렌디/프리미엄) 파라미터
- [x] 9.7 `[LOW]` platform_specs 시드 데이터 — TikTok/Shorts/Reels 해상도, 세이프존, 최적 길이
- [x] 9.8 `[HIGH]` infrastructure/providers/i2v — Runway Gen-4 Turbo 어댑터 (API 연동, 프롬프트 포맷, 응답 정규화)
- [x] 9.9 `[HIGH]` infrastructure/providers/i2v — Hailuo 02 어댑터
- [x] 9.10 `[HIGH]` infrastructure/providers/i2v — Gemini Veo 어댑터
- [x] 9.11 `[HIGH]` infrastructure/providers/i2v — MiniMax 어댑터
- [x] 9.12 `[HIGH]` infrastructure/providers/i2v — ProviderRouter (4-provider 폴백 체인 + 서킷 브레이커 + 플랜별 우선순위 + Best-foot-forward 로직)
- [x] 9.13 `[MED]` infrastructure/media — PromptBuilder (상품 분석 + 스타일 + 카피 → 프로바이더별 프롬프트 변환)
- [x] 9.14 `[HIGH]` infrastructure/media — FFmpegComposer (3클립 연결 + 전경 합성 + 자막/BGM/내레이션/워터마크 레이어 합성)
- [x] 9.15 `[MED]` infrastructure/media — PlatformVariantRenderer (마스터→플랫폼별 변형: 세이프존 조정, 자막 위치, 비트레이트)
- [x] 9.16 `[MED]` application/media — GenerateVideo 유스케이스 (전체 파이프라인 오케스트레이션: 분석→콘텐츠 생성(병렬)→I2V→합성→변형)
- [x] 9.17 `[MED]` application/media — RenderVariants 유스케이스 (마스터→멀티플랫폼 변형 렌더)
- [x] 9.18 `[MED]` application/media — RetryGeneration 유스케이스 (실패/QC 미달 시 자동 재시도 로직)
- [x] 9.19 `[MED]` QC 자동 검증 — 상품 유사도 점수 계산, <70% 시 자동 재생성 (최대 2회)
- [x] 9.20 `[MED]` BullMQ 워커 — media:analyze, media:generate, media:compose, media:render-variant 각 워커 구현
- [x] 9.21 `[LOW]` video_jobs / video_variants 리포지토리 — CRUD + 상태 전이 + 히스토리 조회

## 10. Content Generation — 보조 AI 연동

- [x] 10.1 `[MED]` infrastructure/providers/llm — GPT-4o 카피라이팅 어댑터 (3 변형 카피 세트 생성, 과대광고 필터)
- [x] 10.2 `[LOW]` infrastructure/providers/llm — Claude Haiku 폴백 어댑터
- [x] 10.3 `[MED]` infrastructure/providers/bgm — Udio API 어댑터 (AI BGM 생성, 분위기/스타일 매칭)
- [x] 10.4 `[LOW]` infrastructure/providers/bgm — 로열티 프리 BGM 라이브러리 관리 (20곡 Free / 200+ Starter, 메타데이터 매칭)
- [x] 10.5 `[MED]` infrastructure/providers/tts — Typecast API 어댑터 (3종 음성, 속도 조절 0.8~1.5x, 감정 표현)
- [x] 10.6 `[LOW]` infrastructure/providers/tts — ElevenLabs 폴백 어댑터
- [x] 10.7 `[LOW]` infrastructure/providers/tts — Google Cloud TTS 2차 폴백 어댑터
- [x] 10.8 `[MED]` infrastructure/providers/stt — Deepgram API 어댑터 (단어 단위 타임코드, WER ≤4%, SRT/VTT 출력)
- [x] 10.9 `[MED]` 자막 타이밍 분배 로직 — 내레이션 없을 때 카피 텍스트를 영상 길이에 비례하여 분배
- [x] 10.10 `[LOW]` 자막 세이프존 배치 계산 — 플랫폼별 세이프존 내 자막 위치 자동 결정
- [x] 10.11 `[MED]` BGM 자동 덕킹 로직 — 내레이션 구간 감지 → -12dB 볼륨 감소, 페이드인/아웃
- [x] 10.12 `[LOW]` 프론트엔드: 카피 선택 UI (3개 변형 중 택 1, 직접 수정 가능)
- [x] 10.13 `[LOW]` 프론트엔드: 내레이션 토글 + 음성 선택 + 속도 조절 UI
- [x] 10.14 `[LOW]` 프론트엔드: 자막 스타일 선택 UI (심플/강조/모션 3종)

## 11. Video Output — 프리뷰, 내보내기, 공유

- [x] 11.1 `[MED]` 프론트엔드: 영상 프리뷰 플레이어 — 자동 재생, 전체 화면, 재생 컨트롤
- [x] 11.2 `[MED]` 프론트엔드: 플랫폼 세이프존 오버레이 토글 (TikTok/Shorts/Reels)
- [x] 11.3 `[LOW]` 프론트엔드: MP4 다운로드 기능 (`[상품명]_[플랫폼]_[날짜].mp4` 네이밍)
- [x] 11.4 `[LOW]` 프론트엔드: 전체 변형 다운로드 (Starter, 3개 파일 개별 다운로드)
- [x] 11.5 `[MED]` 프론트엔드: "다른 스타일로 다시 만들기" UI (5회 제한 카운터, 이전/새 버전 비교)
- [x] 11.6 `[LOW]` 워터마크 렌더링 로직 — Free 필수 삽입, Starter 선택, 위치: 우하단
- [x] 11.7 `[HIGH]` SNS 직접 공유: TikTok for Business API 연동 (OAuth 계정 연결, 영상 업로드, 캡션/해시태그 자동 채움)
- [x] 11.8 `[HIGH]` SNS 직접 공유: Meta Graph API 연동 (Instagram Reels 업로드, 비즈니스 계정 필요)
- [x] 11.9 `[LOW]` 프론트엔드: SNS 계정 연결 UI + 공유 버튼
- [x] 11.10 `[LOW]` 프론트엔드: 공유 실패 시 다운로드 폴백 안내

## 12. Frontend 위젯 통합 — 영상 생성 위저드

- [x] 12.1 `[HIGH]` widgets/video-creator — 영상 생성 멀티스텝 위저드 통합 (업로드→분석→모델선택(조건부)→스타일→생성→프리뷰)
- [x] 12.2 `[MED]` 프론트엔드: 생성 진행 UI (프로그레스 바, 단계별 상태, SSE 연동)
- [x] 12.3 `[MED]` 프론트엔드: 생성 히스토리/대시보드 페이지 (페이지네이션, 썸네일, 재다운로드)
- [x] 12.4 `[LOW]` 프론트엔드: 크레딧 부족 시 업그레이드 유도 모달
- [x] 12.5 `[MED]` TanStack Router 라우팅 설정 — /studio/create, /studio/result/:jobId, /dashboard, /settings, /pricing
- [x] 12.6 `[LOW]` 프론트엔드: 반응형 레이아웃 (모바일 웹 PWA 대응)

## 13. 통합 테스트 및 E2E

- [x] 13.1 `[MED]` E2E: 회원가입 → 첫 영상 생성 → 프리뷰 → 다운로드 전체 플로우
- [x] 13.2 `[MED]` E2E: Free 사용자 크레딧 소진 → 업그레이드 유도 → 결제 → Starter 기능 확인
- [x] 13.3 `[MED]` E2E: 모델 페르소나 선택 → 합성 이미지 생성 → 영상 생성 플로우
- [x] 13.4 `[MED]` 통합 테스트: I2V 프로바이더 폴백 시나리오 (Runway 실패 → Hailuo 성공)
- [x] 13.5 `[MED]` 통합 테스트: 웹훅 멱등 처리 (동일 이벤트 2회 수신 → 1회만 반영)
- [x] 13.6 `[MED]` 통합 테스트: SSE 연결 끊김 → Polling 폴백 → 상태 복원
- [x] 13.7 `[LOW]` 통합 테스트: 서킷 브레이커 동작 검증 (5회 실패 → OPEN → Half-open → 복구)
- [x] 13.8 `[LOW]` 성능 테스트: 영상 생성 P95 ≤ 90초 벤치마크
