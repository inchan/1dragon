# zodragon 전략 기획서: Larry OpenClaw 인사이트 기반

> **작성**: 기획팀 / 클리오
> **리서치 소스**: [Oliver Henry - Larry OpenClaw 에이전트 사례](https://gameplaydev.substack.com/p/how-his-openclaw-agent-larry-got)
> **날짜**: 2026-02-24
> **워크플로우 단계**: 리서치 → **기획** ← 현재

---

## 1. 리서치 요약: Larry가 증명한 것

### 1.1 핵심 수치

| 지표 | Larry 달성치 |
|------|------------|
| TikTok 조회수 | 1주일 800만 뷰 |
| MRR | $714 (108 유료 구독자) |
| 포스트당 비용 | $0.25~0.50 (API 비용) |
| 사람 투입 시간 | 포스트당 60초 (음악 추가 + 게시) |
| 성공 훅 비율 | 4/10 포스트가 10만+ 뷰 |
| 자동화율 | ~95% (AI가 리서치→이미지생성→텍스트오버레이→업로드 전담) |

### 1.2 Larry의 핵심 성공 요인

1. **슬라이드쇼 포맷**: TikTok 데이터 기준 비디오 대비 댓글 2.9x, 좋아요 1.9x, 공유 2.6x. 알고리즘이 2026년 슬라이드쇼를 밀어줌.
2. **아키텍처 고정 프롬프트**: 동일 공간의 스타일만 변경하여 일관된 "변환 전/후" 연출.
3. **성과 기반 자동 학습**: 실패한 훅은 규칙이 되고, 성공한 훅은 공식이 됨 (스킬 파일 500줄+).
4. **RevenueCat 수익 추적**: 뷰 수가 아닌 "실제 결제 전환"을 KPI로 사용.
5. **극도의 비용 효율**: $0.50/포스트 → 234,000뷰 가능.

### 1.3 Larry의 훅 공식 (검증됨)

**실패**: 제품 중심 메시지
- "구독하기 전 12+ 스타일로 방을 봐라" → 879뷰

**성공**: 인간 관계 + 갈등 + AI 솔루션
- "[다른 사람] + [갈등] → AI 보여줌 → 생각 바뀜"
- "집주인이 아무것도 못 바꾼다고 해서 AI가 어떻게 보일지 보여줬어" → 234,000뷰

---

## 2. zodragon 현재 상태 vs Larry 비교

| 영역 | Larry (벤치마크) | zodragon (현재) | 갭 수준 |
|------|-----------------|----------------|---------|
| 콘텐츠 포맷 | 슬라이드쇼 6장 (저비용, 고성과) | I2V 비디오 (고비용) | **CRITICAL** |
| 비용/포스트 | $0.25~0.50 | I2V 제공자 $5~20+ | **CRITICAL** |
| 자동화율 | 95% (사람 60초만) | 수동 트리거 + 수동 업로드 | **HIGH** |
| 성과 추적 | RevenueCat 일일 MRR/전환 | 없음 | **CRITICAL** |
| 자동 학습 | 메모리 파일 + 스킬 업데이트 | 없음 | **HIGH** |
| 훅/카피 최적화 | 성과 기반 자동 진화 | PromptBuilder (정적) | **HIGH** |
| 자동 발행 | Postiz API 드래프트 업로드 | OAuth 연결만 (수동 업로드) | **MEDIUM** |
| 스케줄링 | 일일 자동 실행 | 없음 (수동 큐 투입) | **HIGH** |
| 다중 상품 지원 | 단일 앱 마케팅 | 특정 URL 리스트 기반 (목표) | zodragon 우위 |
| 멀티플랫폼 | TikTok 단일 | TikTok + Instagram + YouTube | zodragon 우위 |

---

## 3. zodragon 목표와 목적 (재정의)

### 3.1 비전

> **"상품 URL 하나로, 하루 3건의 최적화된 소셜 콘텐츠를 자동 생성·발행·학습하는 AI 마케팅 에이전트"**

### 3.2 목적 (Why)

- 소규모 셀러/크리에이터가 전문 마케팅 팀 없이도 일일 3건의 고품질 소셜 콘텐츠를 유지할 수 있게 한다.
- Larry가 증명한 "AI 에이전트 마케팅"의 효율성($0.50/포스트 = 23만뷰)을 상품 마케팅 도메인에 적용한다.

### 3.3 목표 (What — 측정 가능한 성공 기준)

| # | 목표 | 측정 기준 | 기한 |
|---|------|----------|------|
| G1 | 슬라이드쇼 모드 추가 | 이미지 6장 + 텍스트 오버레이 자동 생성 | Phase 1 |
| G2 | 포스트당 비용 $1 이하 | API 비용 추적 대시보드 구축 | Phase 1 |
| G3 | 자동화율 90%+ | 사람 투입 = 상품 URL 입력 + 최종 승인(선택) | Phase 2 |
| G4 | 성과 추적 루프 | 플랫폼별 조회수/좋아요/전환 자동 수집 | Phase 2 |
| G5 | 자동 학습 | 성과 기반 훅/카피/스타일 최적화 | Phase 3 |
| G6 | 하루 3건 발행 SLA 99%+ | 30일 기준 달성률 추적 | Phase 2 |
| G7 | 훅 공식 라이브러리 | 카테고리별 검증된 훅 템플릿 10개+ | Phase 1 |

### 3.4 운영 기준 (Larry 벤치마크 적용)

| 항목 | 기준 |
|------|------|
| 일일 발행 수 | 3건 (보상 정책 포함) |
| 대상 플랫폼 | TikTok, Instagram Reels, YouTube Shorts |
| 상품 소스 | 특정 URL 리스트 (크롤링 → 분석 → 콘텐츠) |
| 콘텐츠 포맷 | **슬라이드쇼 (우선)** + 비디오 (선택) |
| 톤/스타일 | 카테고리별 다변화 (패션/인테리어/테크/뷰티 등) |
| KPI | 플랫폼별 차등 (TikTok=조회수+공유, IG=저장+좋아요, YT=구독전환) |
| 비용 상한 | 슬라이드쇼 $1/포스트, 비디오 $10/포스트 |
| 학습 주기 | 7일 단위 성과 분석 → 전략 자동 조정 |

---

## 4. 실행 로드맵 (Phase 분해)

### Phase 1: 슬라이드쇼 파이프라인 + 훅 시스템 (MVP)

> **목표**: Larry의 핵심 무기 — 슬라이드쇼 자동 생성 — 을 zodragon에 이식

#### 4.1.1 새로운 도메인 포트

```
domain/content/
  ports.ts          # SlideshowGeneratorPort, HookLibraryPort, ProductCrawlerPort
  entities.ts       # Slideshow, Slide, Hook, ProductAnalysis
  value-objects.ts  # HookFormula, SlideSpec, ContentTone
  services.ts       # HookSelectionService, SlideLayoutService
```

#### 4.1.2 핵심 구현 항목

| # | 항목 | 설명 | Larry 참고 |
|---|------|------|-----------|
| 1 | 상품 URL 크롤러 | URL → 상품명/이미지/카테고리/가격 자동 추출 | - |
| 2 | 슬라이드쇼 생성기 | 6장 이미지 + 텍스트 오버레이 자동 생성 | gpt-image-1.5 + 아키텍처 고정 |
| 3 | 훅 공식 라이브러리 | 카테고리별 검증된 훅 패턴 | [인물]+[갈등]→[AI 솔루션]→[변화] |
| 4 | 카피 생성기 | 훅 + 캡션 + CTA + 해시태그 자동 생성 | 5개 이하 해시태그 |
| 5 | 플랫폼별 포맷 변환 | TikTok(1024x1536) / IG(1080x1350) / YT(1080x1920) | 슬라이드 사이즈 사양 |
| 6 | 비용 추적기 | API 호출 비용 실시간 집계 | $0.50/포스트 벤치마크 |

#### 4.1.3 산출물

- `POST /api/v1/content/slideshows` — 슬라이드쇼 생성 엔드포인트
- `GET /api/v1/content/hooks?category=fashion` — 훅 라이브러리 조회
- 슬라이드쇼 생성 워커 (BullMQ)
- 비용 추적 대시보드

---

### Phase 2: 자동 발행 + 성과 추적 + SLA 보장

> **목표**: 수동 개입 최소화 + 성과 데이터 수집 시작

#### 4.2.1 핵심 구현 항목

| # | 항목 | 설명 |
|---|------|------|
| 1 | 자동 발행 스케줄러 | 일일 3건 자동 큐 투입 + 시간대 최적화 |
| 2 | Postiz/직접 API 발행 | OAuth 토큰으로 TikTok/IG 자동 드래프트 업로드 |
| 3 | 성과 수집기 | 발행 후 24h/48h/7d 조회수·좋아요·공유·저장 자동 수집 |
| 4 | KPI 대시보드 | 카테고리별·플랫폼별·훅별 성과 비교 |
| 5 | SLA 모니터링 | P0-3 계약서 기반 헬스체크 + 알림 |
| 6 | P0 복원력 구현 | 재시도/DLQ/서킷브레이커 (P0 계약서 기반) |

#### 4.2.2 산출물

- 일일 자동 발행 cron 워커
- 성과 수집 워커 (플랫폼 API 폴링)
- KPI 대시보드 UI
- SLA 모니터링 엔드포인트

---

### Phase 3: 자동 학습 + 최적화 루프

> **목표**: Larry의 진짜 차별점 — 실패에서 배우고 성공을 공식화

#### 4.3.1 핵심 구현 항목

| # | 항목 | 설명 | Larry 참고 |
|---|------|------|-----------|
| 1 | 성과 분석 엔진 | 7일 단위 성과 집계 → 패턴 도출 | "실수한 모든 것이 규칙이 됨" |
| 2 | 훅 최적화기 | 고성과 훅 패턴 자동 학습 + 저성과 패턴 제외 | 뷰/전환 기반 A/B |
| 3 | 스타일 최적화기 | 이미지 스타일/색감/레이아웃 최적화 | 조회수 기반 선호도 학습 |
| 4 | 발행 시간 최적화 | 플랫폼별·카테고리별 최적 발행 시간 학습 | - |
| 5 | 경쟁자 분석기 | 동일 카테고리 인기 콘텐츠 트렌드 수집 | Larry의 경쟁자 리서치 기능 |
| 6 | 수익 추적 연동 | 제휴 링크/쿠폰 기반 전환 추적 | RevenueCat 대응 |

#### 4.3.2 산출물

- 주간 성과 리포트 자동 생성
- 훅 공식 자동 업데이트 파이프라인
- A/B 테스트 프레임워크

---

## 5. 아키텍처 변경 요약

### 5.1 새로운 도메인 컨텍스트

```
domain/
  media/          # (기존) I2V 비디오 파이프라인
  product/        # (기존) 제품 이미지 분석
  model-persona/  # (기존) 모델 페르소나
  content/        # (신규) 슬라이드쇼 + 훅 + 카피 생성
  analytics/      # (신규) 성과 추적 + 자동 학습
  publishing/     # (신규) 자동 발행 스케줄링
```

### 5.2 새로운 포트 인터페이스 (Phase 1)

```typescript
// domain/content/ports.ts

interface SlideshowGeneratorPort {
  generateSlides(input: {
    productAnalysis: ProductAnalysis
    hookFormula: HookFormula
    slideCount: 6
    imageSpec: SlideImageSpec
  }): Promise<Slideshow>
}

interface HookLibraryPort {
  findByCategory(category: string): Promise<HookFormula[]>
  rankByPerformance(hooks: HookFormula[]): HookFormula[]
  recordPerformance(hookId: string, metrics: HookMetrics): Promise<void>
}

interface ProductCrawlerPort {
  crawl(url: string): Promise<ProductAnalysis>
}

interface TextOverlayPort {
  applyOverlay(input: {
    imageUrl: string
    text: string
    position: OverlayPosition
    style: TextStyle
  }): Promise<string>
}
```

### 5.3 기존 파이프라인과의 관계

```
[기존] 상품 URL → ProductAnalyzer → VisionAnalyzerPort
                                          ↓
[기존 경로] → I2V Pipeline → 비디오 생성 (고비용, Phase 2+ 선택 옵션)
                                          ↓
[신규 경로] → Slideshow Pipeline → 이미지 6장 생성 (저비용, Phase 1 기본)
                                          ↓
[공통] → 플랫폼별 포맷 변환 → 자동 발행 → 성과 추적 → 학습 루프
```

---

## 6. 우선순위 판단 근거

### 왜 슬라이드쇼가 먼저인가?

| 기준 | I2V 비디오 | 슬라이드쇼 |
|------|-----------|-----------|
| TikTok 알고리즘 선호도 (2026) | 보통 | 높음 (2.9x 댓글) |
| 포스트당 비용 | $5~20 | $0.25~0.50 |
| 생성 시간 | 3~10분 | 30초~2분 |
| 실패 시 재시도 비용 | 높음 | 매우 낮음 |
| MVP까지 개발 공수 | 이미 구현됨 | Phase 1 필요 |
| 일일 3건 SLA 달성 난이도 | 높음 (비용+시간) | 낮음 |

**결론**: 슬라이드쇼를 **기본 모드**로 추가하고, 기존 I2V 비디오는 **프리미엄 옵션**으로 유지.

---

## 7. 성공 기준 (Phase 1 완료 시)

| # | 기준 | 측정 방법 |
|---|------|----------|
| 1 | 상품 URL → 슬라이드쇼 6장 자동 생성 | E2E 테스트 |
| 2 | 포스트당 비용 $1 미만 | API 비용 로그 집계 |
| 3 | 생성 시간 2분 미만 | 워커 처리 시간 |
| 4 | 3개 플랫폼 포맷 지원 | 포맷 변환 테스트 |
| 5 | 훅 공식 라이브러리 10개+ | DB 레코드 수 |
| 6 | 텍스트 오버레이 정상 렌더링 | 시각적 QA |

---

## 8. 리스크 및 완화

| 리스크 | 영향 | 확률 | 완화 방안 |
|--------|------|------|----------|
| 이미지 생성 API 비용 변동 | 포스트당 비용 초과 | 중 | 다중 제공자 + 배치 API |
| TikTok 슬라이드쇼 알고리즘 변경 | 성과 하락 | 낮 | 멀티포맷 대응 (비디오 폴백) |
| 상품 크롤링 차단 | 입력 데이터 확보 불가 | 중 | 사용자 직접 입력 폴백 |
| 훅 공식 포화 | 반복 콘텐츠 성과 하락 | 중 | Phase 3 자동 학습으로 해결 |

---

## 9. 워크플로우 상태

```
[리서치] ✅ 완료
  └─ Larry OpenClaw 사례 분석 + zodragon 갭 분석

[기획] ✅ 완료 (본 문서)
  └─ 목표·목적 재정의 + 3-Phase 로드맵 + 아키텍처 변경안

[피드백] ⏳ 대기
  └─ 팀장·CEO 리뷰 필요

[재기획] ⏳ 피드백 후
[개발] ⏳ 재기획 승인 후
[QA] ⏳ 개발 완료 후
[피드백] ⏳
[코드리뷰] ⏳
[퀄리티 개발] ⏳
[QA] ⏳
[회고] ⏳
[에이전트업데이트] ⏳
```

---

## Sources

- [Larry OpenClaw 사례 (Substack)](https://gameplaydev.substack.com/p/how-his-openclaw-agent-larry-got)
- [Oliver Henry 원문 트윗](https://x.com/oliverhenry/status/2023776478446436696)
- [Larry ClawHub 스킬](https://clawhub.ai/OllieWazza/larry)
- [OpenClaw 공식 사이트](https://playopenclaw.com/)
- [Genviral OpenClaw 스킬 발표](https://finance.yahoo.com/news/genviral-releases-openclaw-skill-automate-051000525.html)
