# 1Dragon - AI 영상 생성 플랫폼

상품 사진 1장으로 15~30초 숏폼 마케팅 영상을 자동 생성하는 SaaS 플랫폼입니다.

## 🎯 프로젝트 개요

**타겟**: 한국 이커머스 1인 셀러 (네이버 스마트스토어, 쿠팡 셀러)

**핵심 가치**:
- 상품 사진 1장 → 15~30초 숏폼 영상 자동 생성
- 60초 이내 생성 시간
- TikTok/Reels/Shorts 플랫폼 동시 최적화

**비즈니스 모델**: Freemium SaaS
- Free: 월 3개 영상 (워터마크 포함)
- Starter: 월 ₩29,000 (50개 영상)
- Pro: 월 ₩99,000 (무제한 + 4K + API)

## 🛠 기술 스택

### Frontend
- Next.js 15 (App Router)
- React 19
- TypeScript
- TailwindCSS + shadcn/ui
- Zustand (상태 관리)
- React Query (서버 상태)

### Backend
- Next.js API Routes
- PostgreSQL 16 (Prisma ORM)
- Redis (Upstash)
- BullMQ (작업 큐)
- NextAuth.js v5 (인증)

### AI/Video APIs
- **Claude Vision**: 이미지 분석
- **Runway Gen-4 Turbo**: Image-to-Video (핵심)
- **GPT-4o**: 카피라이팅
- **Typecast**: TTS 내레이션
- **Udio**: BGM 생성
- **Deepgram**: 자막 생성
- **Remove.bg**: 배경 제거
- **FFmpeg**: 영상 후처리

### 인프라
- Vercel (Frontend 호스팅)
- Railway/Render (Worker 프로세스)
- AWS S3 + CloudFront (스토리지/CDN)
- Sentry (에러 모니터링)

## 📁 프로젝트 구조

```
1dragon/
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── api/             # API Routes
│   │   ├── (auth)/          # 인증 관련 페이지
│   │   ├── (dashboard)/     # 대시보드
│   │   └── create/          # 영상 생성 페이지
│   ├── components/          # React 컴포넌트
│   │   ├── ui/             # shadcn/ui 컴포넌트
│   │   └── features/       # 기능별 컴포넌트
│   ├── lib/                 # 유틸리티 & 설정
│   │   ├── ai/             # AI API 클라이언트
│   │   ├── queue/          # BullMQ 설정
│   │   └── orchestrator/   # 영상 생성 파이프라인
│   └── types/               # TypeScript 타입 정의
├── prisma/                  # Prisma 스키마 & 마이그레이션
├── public/                  # 정적 파일
└── docs/                    # 프로젝트 문서
```

## 🚀 시작하기

### 1. 환경 변수 설정

```bash
cp .env.example .env
```

`.env` 파일에 필요한 API 키를 입력하세요.

### 2. 의존성 설치

```bash
npm install
```

### 3. 데이터베이스 설정

```bash
npx prisma migrate dev
npx prisma generate
```

### 4. 개발 서버 실행

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) 에서 확인하세요.

## 📋 MVP 개발 로드맵

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
