# 1Dragon - Reference-First Ad Intelligence Workspace

1Dragon은 현재 "광고를 바로 만들기"보다 "브리프를 먼저 분해하고, 공식 레퍼런스에서 구조를 추출하고, 그 결과를 제품에 맞게 재조합하는 것"을 우선하는 저장소로 재정비되고 있습니다. 활성 목표는 상품 사실, 랜딩페이지 truth, 시장 언어, 플랫폼 문법, 공식 광고 레퍼런스를 모아 `설명 가능한 storyline 추천`을 만드는 것입니다.

이 저장소에는 이전 단계의 shortform 생성/검토 런타임이 그대로 남아 있습니다. 그 코드는 이제 하위 validation 인프라이며, 현재 제품의 중심 약속은 아닙니다.

## 현재 제품 목표

- 상품 이미지 1~2장과 제품 사실을 받아 구조화된 brief 입력으로 정규화한다.
- 공식 소스 우선의 레퍼런스/시장 언어/플랫폼 문법을 수집한다.
- 훅 구조, 판매 각도, 증명 방식, 편집 리듬, CTA 위치 같은 패턴 단위로 저장한다.
- 제품 적합도, 플랫폼 적합도, 신선도, 성과 신호, 권리 위험을 반영해 storyline 후보를 랭킹한다.
- 영상 생성 전에 운영자가 검토할 수 있는 brief, angle sheet, storyline 후보군을 출력한다.

현재 범위에서 특히 강한 축:
- rights-safe reference collection and normalization
- product-fact + market-language + platform-grammar synthesis
- operator-facing storyline ranking before downstream creative production

명시적으로 이번 슬라이스에 포함하지 않는 것:
- 영상 생성 자체를 현재 제품의 핵심 가치로 판매하는 것
- 특정 광고 표현, 크리에이터 느낌, 음원, 자막을 베껴 쓰는 것
- 자동 게시/자동 학습 루프

## 문서 읽는 법

- 현재 소스 오브 트루스는 `README.md`, `.planning/PROJECT.md`, `.planning/ROADMAP.md`, `WORKFLOW.md`입니다.
- `docs/` 아래 문서는 전략/리서치/이전 shortform 단계의 기록을 함께 포함합니다. 상단에 pivot note가 없는 문서는 현재 구현보다 넓거나 오래된 문맥일 수 있습니다.

## 🛠 현재 저장소 기술 스택

### Frontend
- Vite
- React 19
- TypeScript
- TanStack Router
- TanStack Query
- shared UI package (`packages/ui`)

### Backend
- Hono
- Drizzle ORM + PostgreSQL
- Redis + BullMQ
- Better Auth
- Sentry

### AI / Media Runtime
- Claude / Gemini 계열 이미지 분석 및 creative helpers
- Gemini Imagen composite flow
- Runway / Hailuo / Gemini Veo / MiniMax provider routing
- FFmpeg composition and variant rendering

## 📁 현재 프로젝트 구조

```
1dragon/
├── apps/
│   ├── web/                  # Vite + React studio UI
│   └── api/                  # Hono API, workers, provider adapters
├── packages/
│   ├── shared/               # shared schemas, enums, contracts
│   ├── ui/                   # shared UI components
│   └── config/               # shared config/tooling
├── docs/                     # strategy, PRD, research, operations
├── openspec/                 # active and archived product changes
└── tooling/                  # validation, smoke, feedback-loop scripts
```

## 🚀 시작하기

### 1. 환경 변수 설정

```bash
cp .env.example .env
```

`.env` 파일에 필요한 API 키를 입력하세요.

### 2. 의존성 설치

```bash
pnpm install
```

### 3. 데이터베이스 설정

```bash
pnpm --filter @1dragon/api db:seed:plans
pnpm --filter @1dragon/api db:seed:model-persona
pnpm --filter @1dragon/api db:seed:style-presets
pnpm --filter @1dragon/api db:seed:platform-specs
```

### 4. 개발 서버 실행

```bash
pnpm dev
```

기본 로컬 엔드포인트:
- Web: `http://localhost:5173`
- API: `http://localhost:3001`

## 레거시 downstream runtime 검증

아래 스크립트들은 이전 shortform/video runtime을 검증하는 하위 도구입니다. 현재 pivot 단계에서는 "주력 제품 기능"이 아니라 이후 reference-first brief를 검증할 때 연결할 수 있는 downstream validation 자산으로 취급합니다.

## 테스트 이미지/영상 검증

생성된 산출물은 `ffprobe` 기반 로컬 검증 스크립트로 빠르게 확인할 수 있습니다.

```bash
npm run media:validate -- \
  --image artifacts/test-product-20260309-020243.png \
  --video artifacts/test-video-20260309-020243.mp4 \
  --out artifacts/test-media-validation.json
```

최신 테스트 산출물을 자동으로 고르려면 아래 스크립트를 사용합니다.

```bash
npm run media:validate:latest
```

## 직접 Gemini smoke 테스트

첫 단계 검증은 전체 API/워커 런타임을 올리기 전에 Gemini provider 자체가 살아 있는지 확인하는 것입니다.
모든 실행 결과는 `artifacts/live-media-smoke/` 아래에 저장됩니다.

이미지 생성 smoke:

```bash
pnpm media:smoke:image -- \
  --prompt "A premium ecommerce hero image of a plaid dress in a clean studio, photorealistic, soft lighting" \
  --aspect-ratio 9:16
```

착장 composite smoke:

```bash
pnpm media:smoke:composite -- \
  --image /absolute/path/to/product-image.png \
  --persona-brief "A real adult woman wearing the exact garment in a premium boutique studio, full body, confident pose"
```

비디오 생성 smoke:

```bash
pnpm media:smoke:video -- \
  --image /absolute/path/to/source-image.png \
  --prompt "Create a short vertical ecommerce video from this source image. Preserve the product identity exactly." \
  --aspect-ratio 9:16 \
  --duration-seconds 8
```

필수 환경 변수:
- `GEMINI_IMAGEN_API_KEY` 또는 `GEMINI_VEO_API_KEY` for image smoke
- `GEMINI_API_KEY` 또는 `GEMINI_VEO_API_KEY` for composite smoke
- `GEMINI_VEO_API_KEY` for video smoke

이 smoke 경로는 provider 호출 자체를 검증합니다. 인증, DB, Redis, S3, worker orchestration까지 포함한 full-stack 성공을 의미하지는 않습니다.

## Composite-first 숏폼 테스트 플로우

패션 상품처럼 `product-only -> Veo`가 부자연스러운 경우에는 composite-first 플로우를 사용합니다.
이 경로는 `상품 이미지 -> Gemini composite image -> Veo 8초 영상 -> Gemini ad review` 순서로 실행됩니다.

```bash
pnpm media:smoke:shortform -- \
  --image /absolute/path/to/product-image.png \
  --hook "첫 장면부터 시선 정지" \
  --message "핏과 실루엣이 바로 보이는 원피스" \
  --cta "지금 코디 확인" \
  --cta-mode external-overlay
```

기본값:
- 8초 Veo
- wearer-first opening 요구
- `cta-mode external-overlay`

## Gemini 광고 리뷰 루프

생성된 후보 영상을 기술 통과 여부가 아니라 광고 적합성 기준으로 점검하려면 Gemini 리뷰 루프를 사용합니다.
이 루프는 source image, sampled frames, technical validation 결과를 함께 보고 `사람 등장`, `능동 시연`, `스토리`, `메시지`, `CTA`를 fail-closed 방식으로 평가합니다.

```bash
pnpm media:review:gemini -- \
  --image /absolute/path/to/source-image.png \
  --video-dir apps/api/scripts/output \
  --iterations 3 \
  --review-backend cli-then-api \
  --hook "첫 장면부터 시선 정지" \
  --message "핏과 실루엣이 바로 보이는 원피스" \
  --cta "지금 코디 확인"
```

핵심 옵션:
- `--review-backend api|cli|cli-then-api`
- `--hook`, `--message`, `--cta`, `--audience`
- `--cta-mode in-video|external-overlay`
- `--allow-product-only-opening`
- `--allow-no-human`, `--allow-passive-demo`, `--allow-no-story`, `--allow-no-message`, `--allow-no-cta`

운영 권장:
- 기본 게이트는 `api`를 사용합니다. 검증 중 같은 샘플에서 `cli` 평가는 더 흔들릴 수 있었습니다.
- `cli` 또는 `cli-then-api`는 로컬 연구/탐색용 reviewer로 두고, 최종 pass/fail 판정은 API 결과를 우선합니다.
- 패션 광고 테스트에서는 `product-only` 첫 프레임보다 `wearer-first composite`를 우선합니다.
- CTA를 후처리 오버레이로 넣을 계획이면 `--cta-mode external-overlay`를 사용합니다.

산출물:
- `artifacts/gemini-review-loop/<run-id>/loop-summary.json`
- `artifacts/gemini-review-loop/<run-id>/loop-summary.md`
- iteration별 `technical-validation.json`, `gemini-review.json`, `iteration-summary.json`

## 피드백 루프 (확장 + 학습 + 개선)

테스트 영상을 여러 버전으로 자동 생성하고, 규격/의도/표시(변화량)를 함께 점수화해서
가장 좋은 후보를 고릅니다. 결과는 `artifacts/feedback-loop/`에 누적 저장됩니다.

```bash
npm run media:loop -- \
  --image artifacts/test-product-20260309-020243.png \
  --iterations 3 \
  --headline "1Dragon TEST AD" \
  --intent "상품 핵심가치를 15초 안에 전달" \
  --cta "지금 영상 만들기"
```

생성물:
- `artifacts/feedback-loop/<run-id>/candidate-*.mp4`
- `artifacts/feedback-loop/<run-id>/loop-summary.json`
- `artifacts/feedback-loop/<run-id>/loop-summary.md`
- `artifacts/feedback-loop/history.jsonl` (학습 히스토리)

## 📋 Historical MVP 메모

아래 섹션은 photo-to-video SaaS를 전제로 작성된 과거 메모입니다. 현재 실행 기준은 `.planning/ROADMAP.md`를 우선합니다.

### Sprint 0: 기반 구축 (Week 1) ✅
- [x] 프로젝트 초기화
- [ ] DB 스키마 설계
- [ ] 인증 시스템
- [ ] 기본 UI 구조

### Sprint 1: 핵심 파이프라인 (Week 2-3)
- [ ] 이미지 업로드 & Claude Vision 분석
- [ ] Remove.bg 배경 제거 연동
- [ ] Runway Gen-4 Turbo I2V 연동
- [ ] FFmpeg 후처리 파이프라인
- [ ] 오케스트레이션 엔진

### Sprint 2: 보조 AI + UI (Week 4-5)
- [ ] GPT-4o 카피라이팅
- [ ] Typecast TTS 연동
- [ ] Udio BGM 연동
- [ ] Deepgram 자막 연동
- [ ] 프리뷰 & 다운로드 UI

### Sprint 3: 계정 & 결제 (Week 5-6)
- [ ] 소셜 로그인 (카카오/Google)
- [ ] Free/Starter 플랜 시스템
- [ ] 토스페이먼츠 결제 연동
- [ ] 생성 히스토리 대시보드

### Sprint 4: QA & 런칭 (Week 6)
- [ ] 통합 테스트
- [ ] 성능 최적화 (60초 이내 생성)
- [ ] 클로즈드 베타 (100명)

## 📊 MVP 성공 지표

- **가입 사용자**: 10,000명 (3개월)
- **첫 영상 생성률**: 40% 이상
- **Time-to-Value**: 60초 이내
- **영상 생성 성공률**: 95% 이상
- **Week 1 리텐션**: 25% 이상
- **유료 전환율**: 2% 이상
- **영상 1건 원가**: $1.00 이하

## 📚 문서

자세한 문서는 `/docs` 디렉토리를 참조하세요:
- [PRD (제품 요구사항 문서)](docs/03-product/PRD.md)
- [MVP 범위](docs/03-product/MVP_SCOPE.md)
- [기술 조사 보고서](docs/01-research/TECH_RESEARCH.md)
- [비즈니스 모델](docs/02-strategy/BUSINESS_MODEL.md)

## 🤝 기여

MVP 개발 중이며, 현재 외부 기여는 받지 않습니다.

## 📝 라이선스

ISC

---

**개발 팀**: 1Dragon Team
**개발 시작**: 2026-02-11
**목표 런칭**: 2026-04-11 (Beta)
