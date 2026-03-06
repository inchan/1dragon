# 1Dragon 프로젝트 문서 종합 요약 및 정리 계획

**작성일**: 2026-02-10
**작성 방법**: 각 파일을 Gemini 에이전트에게 위임하여 요약 후 통합

---

## 1. 프로젝트 개요

**서비스명**: 1Dragon
**핵심 가치**: 상품 사진 1장 → 15~30초 숏폼 마케팅 영상 자동 생성 (TikTok/Reels/Shorts 동시 배포)
**비즈니스 모델**: Freemium SaaS (B2C 바이럴 + B2B 수익)
**타겟 시장**: 한국 이커머스 셀러 (네이버 스마트스토어/쿠팡) → 글로벌 확장

---

## 2. 전체 파일 요약

### 2.1 루트 파일 (초기 리서치 - docs/ 폴더 이전 작성)

| # | 파일명 | 크기 | 핵심 주제 | 분할 필요 |
|---|--------|------|----------|----------|
| 1 | `상품이미지_AI기술_조사보고서_2025_02.md` | 34KB | 배경제거/VirtualTryOn/3D변환/카메라모션/업스케일링 5개 분야 기술 조사 | **예** |
| 2 | `personas.md` | 33KB | 7명의 UX 페르소나(B2B/B2C 세분화) | **예** |
| 3 | `user-journey-map.md` | 25KB | B2B/B2C 사용자 여정 7단계 + 가격 전략 | 아니오 |
| 4 | `shortform_commerce_2024_2025.md` | 19KB | 6개 플랫폼 숏폼 커머스 트렌드/AI 정책/규제 | 아니오 |
| 5 | `AI_영상생성_비용분석_2025년2월.md` | 12KB | AI 영상 파이프라인 원가 $1.21~$4.10/건 분석 | 아니오 |

### 2.2 docs/01-research/ (리서치 단계)

| # | 파일명 | 크기 | 핵심 주제 | 분할 필요 |
|---|--------|------|----------|----------|
| 6 | `USER_RESEARCH.md` | 107KB | 페르소나/여정맵/니즈매트릭스/가격민감도/출력스펙 종합 | **예 (필수)** |
| 7 | `TECH_RESEARCH.md` | 30KB | I2V 모델 비교, 원가 분석, Build vs Buy, MVP 기술 스택 | 아니오 |
| 8 | `MARKET_RESEARCH.md` | 23KB | TAM/SAM/SOM, 경쟁사 매트릭스, 시장 규모 | 아니오 |

### 2.3 docs/02-strategy/ (전략 단계)

| # | 파일명 | 크기 | 핵심 주제 | 분할 필요 |
|---|--------|------|----------|----------|
| 9 | `GTM_STRATEGY.md` | 52KB | PLG-First GTM, AARRR KPI, 파트너십, 글로벌 확장 로드맵 | **예** |
| 10 | `BUSINESS_MODEL.md` | 31KB | 4-tier 가격, 단위 경제학, 3년 재무 전망, 펀딩 전략 | **예** |
| 11 | `VISION.md` | 29KB | 3년 비전, 5대 차별화, 해자 전략, Phase 로드맵 | 아니오 |

### 2.4 docs/03-product/ (제품 단계)

| # | 파일명 | 크기 | 핵심 주제 | 분할 필요 |
|---|--------|------|----------|----------|
| 12 | `PRD.md` | 51KB | 8개 에픽, 39개 기능, 사용자 스토리, 비기능 요구사항 | **예** |
| 13 | `USER_FLOWS.md` | 44KB | 온보딩/영상생성/편집/내보내기/결제/에러 플로우 (Mermaid) | **예** |
| 14 | `FEATURE_SPEC.md` | 29KB | F001~F015 기능별 상세 스펙, 에지케이스, 의존성 | 아니오 |
| 15 | `MVP_SCOPE.md` | 23KB | MVP 12개 기능, 기술 아키텍처, 개발 일정 | 아니오 |

### 2.5 docs/04-simulation/ (시뮬레이션 단계)

| # | 파일명 | 크기 | 핵심 주제 | 분할 필요 |
|---|--------|------|----------|----------|
| 16 | `DIALECTIC_ANALYSIS.md` | 54KB | Red/Blue Team 변증법 검증 → 강점5/약점6/논쟁5/Action13 | **예** |
| 17 | `STAKEHOLDER_SIMULATION.md` | 48KB | 4개 이해관계자 그룹 갈등 시뮬레이션 → 합의안10개 | **예** |
| 18 | `DECISION_TREE.md` | 40KB | Tree of Thoughts 의사결정 트리 → 피봇 시나리오6개 | **예** |

---

## 3. 문서 간 연관성 맵

```
                    ┌──────────────────────────────────────────┐
                    │           루트 초기 리서치                  │
                    │  상품이미지AI조사 · 비용분석 · 숏폼커머스    │
                    │  personas · user-journey-map              │
                    └─────────────┬────────────────────────────┘
                                  │ (통합·발전)
                    ┌─────────────▼────────────────────────────┐
                    │        01-research                        │
                    │  USER_RESEARCH ← personas + journey       │
                    │  TECH_RESEARCH ← AI기술조사 + 비용분석     │
                    │  MARKET_RESEARCH ← 숏폼커머스 + 시장조사   │
                    └─────────────┬────────────────────────────┘
                                  │ (전략 수립)
                    ┌─────────────▼────────────────────────────┐
                    │        02-strategy                        │
                    │  VISION · BUSINESS_MODEL · GTM_STRATEGY   │
                    └─────────────┬────────────────────────────┘
                                  │ (제품 정의)
                    ┌─────────────▼────────────────────────────┐
                    │        03-product                         │
                    │  PRD · FEATURE_SPEC · MVP_SCOPE ·         │
                    │  USER_FLOWS                               │
                    └─────────────┬────────────────────────────┘
                                  │ (검증·시뮬레이션)
                    ┌─────────────▼────────────────────────────┐
                    │        04-simulation                      │
                    │  DIALECTIC · STAKEHOLDER · DECISION_TREE  │
                    └──────────────────────────────────────────┘
```

---

## 4. 내용 중복 분석

| 중복 영역 | 원본 위치 | 중복 위치 | 처리 방안 |
|----------|----------|----------|----------|
| 페르소나 7명 정의 | `personas.md` (루트) | `USER_RESEARCH.md` 내 동일 내용 포함 | 루트 파일 → docs/01-research로 이동 후 USER_RESEARCH에서 링크 참조 |
| 사용자 여정 맵 | `user-journey-map.md` (루트) | `USER_RESEARCH.md` 내 동일 내용 포함 | 루트 파일 → docs/01-research로 이동 후 USER_RESEARCH에서 링크 참조 |
| AI 기술 조사 | `상품이미지_AI기술_조사보고서_2025_02.md` (루트) | `TECH_RESEARCH.md` 일부 중복 | 루트 파일 → docs/01-research로 이동 |
| 비용 분석 | `AI_영상생성_비용분석_2025년2월.md` (루트) | `TECH_RESEARCH.md` 비용 섹션과 중복 | 루트 파일 → docs/01-research로 이동 |
| 숏폼 커머스 트렌드 | `shortform_commerce_2024_2025.md` (루트) | `MARKET_RESEARCH.md` 플랫폼 분석과 중복 | 루트 파일 → docs/01-research로 이동 |
| 가격 전략 | `BUSINESS_MODEL.md` 가격 티어 | `GTM_STRATEGY.md` 가격 체계, `USER_RESEARCH.md` 가격 민감도 | 가격 정의는 BUSINESS_MODEL에 집중, 나머지는 링크 참조 |
| 리스크/피봇 | `DIALECTIC_ANALYSIS.md` 피봇 시나리오 | `DECISION_TREE.md` 피봇 경로 | 상호 참조 링크 추가 (중복이 아닌 심화 관계) |

---

## 5. 통합 및 정리 계획

### Phase 1: 루트 파일 정리 (이동 + 링크 연결)

루트에 산재한 5개 초기 리서치 파일을 `docs/01-research/raw/` 폴더로 이동하여 원본 보존.

```
docs/01-research/
├── raw/                              ← NEW: 원본 보존
│   ├── 상품이미지_AI기술_조사보고서_2025_02.md
│   ├── personas.md
│   ├── user-journey-map.md
│   ├── shortform_commerce_2024_2025.md
│   └── AI_영상생성_비용분석_2025년2월.md
├── USER_RESEARCH.md                  ← raw/ 파일 참조 링크 추가
├── TECH_RESEARCH.md                  ← raw/ 파일 참조 링크 추가
└── MARKET_RESEARCH.md                ← raw/ 파일 참조 링크 추가
```

### Phase 2: 큰 파일 분할 (30KB 초과)

#### USER_RESEARCH.md (107KB → 5개 파일)
```
docs/01-research/
├── USER_RESEARCH.md                  ← 목차 + 요약 + 링크 허브 (5KB)
├── user-research/
│   ├── 01-personas.md                ← 7명 페르소나 상세 (~25KB)
│   ├── 02-journey-maps.md            ← B2B/B2C 여정 맵 (~20KB)
│   ├── 03-needs-matrix.md            ← 기능 니즈 우선순위 + 가격 민감도 (~20KB)
│   ├── 04-quality-customization.md   ← 품질 기대 + 자동화 vs 커스텀 (~15KB)
│   └── 05-platform-specs.md          ← 출력 스펙 + 종합 인사이트 (~20KB)
```

#### GTM_STRATEGY.md (52KB → 3개 파일)
```
docs/02-strategy/
├── GTM_STRATEGY.md                   ← 목차 + 핵심 요약 + 링크 허브 (5KB)
├── gtm/
│   ├── 01-launch-growth.md           ← Phase 0~1, AARRR 퍼널, 바이럴 (~18KB)
│   ├── 02-partnerships-content.md    ← 파트너십, 콘텐츠 마케팅, 한국 특화 (~18KB)
│   └── 03-global-kpi-budget.md       ← 글로벌 확장, KPI, 예산, 리스크 (~16KB)
```

#### BUSINESS_MODEL.md (31KB → 유지 또는 경량 분할)
경미한 초과이므로 분할하지 않고 유지 가능. 필요시:
```
docs/02-strategy/
├── BUSINESS_MODEL.md                 ← 목차 + 가격 + 단위 경제학 (20KB)
├── business-model/
│   └── 01-financial-projections.md   ← 3년 재무 전망 + 펀딩 전략 (11KB)
```

#### PRD.md (51KB → 3개 파일)
```
docs/03-product/
├── PRD.md                            ← 목차 + 핵심 요약 + 링크 허브 (5KB)
├── prd/
│   ├── 01-epics-stories.md           ← 8개 에픽, 사용자 스토리 (~20KB)
│   ├── 02-functional-requirements.md ← 기능 요구사항 상세 (~15KB)
│   └── 03-nfr-architecture.md        ← 비기능 요구사항, 아키텍처 (~11KB)
```

#### USER_FLOWS.md (44KB → 3개 파일)
```
docs/03-product/
├── USER_FLOWS.md                     ← 목차 + 요약 + 링크 허브 (3KB)
├── user-flows/
│   ├── 01-onboarding-generation.md   ← 온보딩 + 영상 생성 플로우 (~15KB)
│   ├── 02-edit-export-payment.md     ← 편집 + 내보내기 + 결제 플로우 (~15KB)
│   └── 03-error-batch.md             ← 에러/예외 + 배치 처리 플로우 (~14KB)
```

#### DIALECTIC_ANALYSIS.md (54KB → 2개 파일)
```
docs/04-simulation/
├── DIALECTIC_ANALYSIS.md             ← 목차 + 요약 + 링크 허브 (3KB)
├── dialectic/
│   ├── 01-red-team-attack.md         ← 7개 영역 공격 논거 (~25KB)
│   └── 02-defense-synthesis.md       ← 방어 + 합의 + 리스크 대시보드 (~26KB)
```

#### STAKEHOLDER_SIMULATION.md (48KB → 2개 파일)
```
docs/04-simulation/
├── STAKEHOLDER_SIMULATION.md         ← 목차 + 요약 + 링크 허브 (3KB)
├── stakeholder/
│   ├── 01-group-perspectives.md      ← 4개 그룹 관점 분석 (~22KB)
│   └── 02-conflicts-consensus.md     ← 갈등 해소 + 합의안 + 추가 리스크 (~23KB)
```

#### DECISION_TREE.md (40KB → 2개 파일)
```
docs/04-simulation/
├── DECISION_TREE.md                  ← 목차 + 요약 + 링크 허브 (3KB)
├── decision-tree/
│   ├── 01-tree-branch-analysis.md    ← 전체 트리 + 분기점 상세 (~23KB)
│   └── 02-paths-guides-risks.md      ← 핵심 경로 + 의사결정 가이드 (~17KB)
```

#### 상품이미지_AI기술_조사보고서 (34KB → 2개 파일, raw/ 내)
```
docs/01-research/raw/
├── 상품이미지_AI기술_조사보고서_2025_02.md  ← 목차 + 요약 + 링크 (3KB)
├── ai-tech-report/
│   ├── 01-image-processing.md        ← 배경제거 + 업스케일링 (~15KB)
│   └── 02-3d-motion-tryon.md         ← VirtualTryOn + 3D변환 + 카메라모션 (~16KB)
```

#### personas.md (33KB → 2개 파일, raw/ 내)
```
docs/01-research/raw/
├── personas.md                       ← 목차 + 요약 매트릭스 + 링크 (3KB)
├── personas/
│   ├── 01-b2c-personas.md            ← B2C 페르소나 3명 (~14KB)
│   └── 02-b2b-personas.md            ← B2B 페르소나 4명 + 매트릭스 (~16KB)
```

### Phase 3: 목차 인덱스 문서 생성

프로젝트 루트에 전체 문서 네비게이션 허브를 생성합니다.

```
docs/
├── INDEX.md                          ← 전체 문서 목차 + 각 파일 1줄 요약 + 링크
├── 01-research/
├── 02-strategy/
├── 03-product/
└── 04-simulation/
```

### Phase 4: 상호 참조 링크 추가

각 문서의 "관련 문서" 섹션에 다른 문서로의 링크를 추가하여 네비게이션을 개선합니다.

---

## 6. 최종 디렉토리 구조 (정리 후)

```
/Users/chans/zo4/
├── docs/
│   ├── INDEX.md                              ← 전체 네비게이션 허브
│   │
│   ├── 01-research/
│   │   ├── raw/                              ← 초기 리서치 원본
│   │   │   ├── 상품이미지_AI기술_조사보고서_2025_02.md (허브)
│   │   │   ├── ai-tech-report/
│   │   │   │   ├── 01-image-processing.md
│   │   │   │   └── 02-3d-motion-tryon.md
│   │   │   ├── personas.md (허브)
│   │   │   ├── personas/
│   │   │   │   ├── 01-b2c-personas.md
│   │   │   │   └── 02-b2b-personas.md
│   │   │   ├── user-journey-map.md           ← 분할 불필요
│   │   │   ├── shortform_commerce_2024_2025.md ← 분할 불필요
│   │   │   └── AI_영상생성_비용분석_2025년2월.md ← 분할 불필요
│   │   ├── USER_RESEARCH.md (허브)
│   │   ├── user-research/
│   │   │   ├── 01-personas.md
│   │   │   ├── 02-journey-maps.md
│   │   │   ├── 03-needs-matrix.md
│   │   │   ├── 04-quality-customization.md
│   │   │   └── 05-platform-specs.md
│   │   ├── TECH_RESEARCH.md                  ← 분할 불필요
│   │   └── MARKET_RESEARCH.md                ← 분할 불필요
│   │
│   ├── 02-strategy/
│   │   ├── VISION.md                         ← 분할 불필요
│   │   ├── BUSINESS_MODEL.md                 ← 경미, 유지 가능
│   │   ├── GTM_STRATEGY.md (허브)
│   │   └── gtm/
│   │       ├── 01-launch-growth.md
│   │       ├── 02-partnerships-content.md
│   │       └── 03-global-kpi-budget.md
│   │
│   ├── 03-product/
│   │   ├── PRD.md (허브)
│   │   ├── prd/
│   │   │   ├── 01-epics-stories.md
│   │   │   ├── 02-functional-requirements.md
│   │   │   └── 03-nfr-architecture.md
│   │   ├── USER_FLOWS.md (허브)
│   │   ├── user-flows/
│   │   │   ├── 01-onboarding-generation.md
│   │   │   ├── 02-edit-export-payment.md
│   │   │   └── 03-error-batch.md
│   │   ├── FEATURE_SPEC.md                   ← 분할 불필요
│   │   └── MVP_SCOPE.md                      ← 분할 불필요
│   │
│   └── 04-simulation/
│       ├── DIALECTIC_ANALYSIS.md (허브)
│       ├── dialectic/
│       │   ├── 01-red-team-attack.md
│       │   └── 02-defense-synthesis.md
│       ├── STAKEHOLDER_SIMULATION.md (허브)
│       ├── stakeholder/
│       │   ├── 01-group-perspectives.md
│       │   └── 02-conflicts-consensus.md
│       ├── DECISION_TREE.md (허브)
│       └── decision-tree/
│           ├── 01-tree-branch-analysis.md
│           └── 02-paths-guides-risks.md
│
└── .claude/
    └── settings.local.json
```

---

## 7. 작업 우선순위

| 순서 | 작업 | 설명 |
|:---:|------|------|
| 1 | 루트 파일 5개 이동 | `docs/01-research/raw/`로 이동 |
| 2 | USER_RESEARCH.md 분할 | 가장 큰 파일(107KB) → 5개 파일 |
| 3 | INDEX.md 생성 | 전체 네비게이션 허브 |
| 4 | 04-simulation/ 3개 파일 분할 | DIALECTIC/STAKEHOLDER/DECISION_TREE |
| 5 | 03-product/ 2개 파일 분할 | PRD/USER_FLOWS |
| 6 | 02-strategy/ 1개 파일 분할 | GTM_STRATEGY |
| 7 | 루트 raw/ 2개 파일 분할 | AI기술조사/personas |
| 8 | 상호 참조 링크 추가 | 모든 허브 파일에 관련 문서 링크 |

---

## 8. 핵심 수치 요약

| 항목 | 수치 |
|------|------|
| 총 파일 수 | 18개 |
| 총 문서 크기 | ~650KB |
| 30KB 초과 파일 | 11개 (분할 대상) |
| 분할 후 예상 파일 수 | ~40개 (허브 + 하위 파일) |
| 분할 후 최대 파일 크기 | ~25KB 이하 |

---

> **역할 정의**
> 본 작업에서 다음 역할이 수행되었습니다:
> - **오케스트레이터** (Claude): 요구사항 분해, 5개 병렬 작업 설계, 결과 통합
> - **사서/리서처** (Gemini 위임): 18개 파일 요약, 내용 분석, 연관성 파악
> - **정보 아키텍트** (Claude): 디렉토리 구조 설계, 분할 기준 수립, 통합 계획 수립
