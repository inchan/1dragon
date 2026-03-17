# 1Dragon Documentation

> **1Dragon**: 브리프 분해, 공식 레퍼런스 수집, 패턴 추출, storyline 랭킹을 우선하는 reference-first ad intelligence workspace

## Current Reading Order

1. `README.md`
2. `.planning/PROJECT.md`
3. `.planning/ROADMAP.md`
4. `WORKFLOW.md`

`docs/` 아래에는 현재 pivot 기준 문서와 이전 shortform/video 단계 문서가 함께 있습니다. 별도 pivot note가 없는 문서는 historical 또는 runtime-reference 문서일 수 있습니다.

## 📚 Documentation Index

### 1. Research (조사 및 분석)
- **[시장 조사 (Market Research)](01-research/MARKET_RESEARCH.md)**: 시장 규모, 경쟁 현황, 규제 환경
- **[기술 조사 (Tech Research)](01-research/TECH_RESEARCH.md)**: AI 모델 비교, 기술 스택, 아키텍처
- **[autoresearch 통합 리서치](01-research/AUTORESEARCH_INTEGRATION_RESEARCH_2026-03-14.md)**: Andrej Karpathy의 autoresearch를 Claude Code / Codex / 1dragon 워크플로에 적용하는 비교 분석
- **[autoresearch 스킬 v0 가이드](01-research/AUTORESEARCH_SKILL_V0_GUIDE.md)**: 시장·경쟁 조사용 내부 Codex 스킬의 목적, 입력 계약, 출력 형식, 저장 규약
- **[사용자 조사 (User Research)](01-research/user-research/hub.md)**
  - [사용자 페르소나](01-research/user-research/01-personas.md)
  - [시장 규모 (TAM/SAM/SOM)](01-research/user-research/02-market-size.md)
  - [니즈 분석](01-research/user-research/03-needs-analysis.md)
  - [가격 민감도](01-research/user-research/04-pricing-sensitivity.md)
  - [플랫폼 스펙](01-research/user-research/05-platform-specs.md)
  - [전략적 시사점](01-research/user-research/06-strategic-implications.md)

### 2. Strategy (전략 수립)
- **[비전 및 전략 (Vision)](02-strategy/VISION.md)**: 미션, 차별화 전략, 로드맵
- **[비즈니스 모델 (Business Model)](02-strategy/BUSINESS_MODEL.md)**: 수익 모델, 가격 정책, 재무 전망
- **[GTM 전략 (Go-to-Market)](02-strategy/GTM_STRATEGY.md)**: 런칭 전략, 채널 전략, 마케팅 계획

### 3. Product (제품 기획)
- **[PRD (Product Requirements Document)](03-product/PRD.md)**: 제품 요구사항, 기능 명세
- **[MVP 범위 (MVP Scope)](03-product/MVP_SCOPE.md)**: MVP 기능, 일정, 마일스톤
- **[기능 명세서 (Feature Spec)](03-product/FEATURE_SPEC.md)**: 상세 기능 정의, 예외 처리
- **[사용자 플로우 (User Flows)](03-product/USER_FLOWS.md)**: UX 플로우, 와이어프레임
- **[숏폼 커머스 실전 제작 SOP](03-product/SHORTFORM_COMMERCE_PRODUCTION_SOP.md)**: prior shortform production SOP; 현재는 reference/ranking 단계 이후 downstream 제작 참고 문서
  - [15초 샷리스트 템플릿](03-product/templates/shortform_15s_shotlist.csv)
  - [A/B 테스트 매트릭스 템플릿](03-product/templates/ab_test_matrix.csv)
  - [7일 제작 콜시트 템플릿](03-product/templates/production_callsheet_7day.md)
- **[인플루언서형 광고 영상 실행 문서](03-product/INFLUENCER_AD_WORKFLOW_EXECUTION.md)**: historical execution note for earlier video-first experiments

### 4. Simulation (검증 및 시뮬레이션)
- **[변증법 분석 (Dialectic Analysis)](04-simulation/dialectic-analysis/hub.md)**
  - [Red Team 공격](04-simulation/dialectic-analysis/01-red-team.md)
  - [Blue Team 방어](04-simulation/dialectic-analysis/02-blue-team.md)
  - [통합 합의](04-simulation/dialectic-analysis/03-synthesis.md)
- **[이해관계자 시뮬레이션 (Stakeholder Simulation)](04-simulation/stakeholder-simulation/hub.md)**
  - [그룹별 관점](04-simulation/stakeholder-simulation/01-perspectives.md)
  - [갈등 매트릭스](04-simulation/stakeholder-simulation/02-conflicts.md)
  - [갈등 해소안](04-simulation/stakeholder-simulation/03-resolutions.md)
- **[의사결정 트리 (Decision Tree)](04-simulation/decision-tree/hub.md)**
  - [경로 분석](04-simulation/decision-tree/01-analysis.md)
  - [핵심 시나리오](04-simulation/decision-tree/02-scenarios.md)
  - [가이드 & 리스크](04-simulation/decision-tree/03-guide.md)

### 5. Architecture (시스템 설계)
- **[초기 설계 (Initial Design)](05-architecture/INITIAL_DESIGN.md)**: MVP 기술 스택, 디렉토리 구조, 핵심 인터페이스
- **[Gap 분석 (Gap Analysis)](05-architecture/GAP_ANALYSIS_REPORT.md)**: PRD vs 설계 정합성 검증
- **[개정 설계 (Revised Design)](05-architecture/REVISED_DESIGN.md)**: Gap 보완 후 최종 확정 아키텍처 (Week 3 기준)
- **[Agentic AI 통합 문서](05-architecture/AGENTIC_AI_SYSTEMS.md)**: agentic-ai-systems 패턴을 1dragon 파이프라인에 맞게 이식한 구조

### 6. Operations (운영/신뢰성)
- **[구조 진단 및 실행 계획](06-operations/ZODRAGON_STRUCTURE_GAP_PLAN_2026-02-24.md)**: 분야별 상태/갭/P0~P2 실행계획
- **[P0 신뢰성 포트 계약서](06-operations/P0_RELIABILITY_PORT_CONTRACT.md)**: 재시도·DLQ·서킷·헬스체크 타입 기준
- **[P0 운영 기준서](06-operations/P0_RELIABILITY_RUNBOOK.md)**: 장애 대응/운영 규칙
- **[P0 QA 체크리스트](06-operations/P0_RELIABILITY_QA_CHECKLIST.md)**: 회귀 검증 항목
- **[Agentic AI 검증 체크리스트](06-operations/AGENTIC_AI_VALIDATION_CHECKLIST.md)**: agentic routing / API / 워커 / 웹 검증 순서
- **[Agentic AI PR 체크리스트](06-operations/AGENTIC_AI_PR_CHECKLIST.md)**: PR 제출 전 필수 점검 항목
- **[파이프라인 단계별 검증 문서](06-operations/PIPELINE_STAGE_VALIDATION.md)**: 가장 작은 단계 단위로 프로세스/산출물 검증 현황 정리

---
> **Note**: This documentation structure is designed to support the AI-Driven Development Lifecycle (AI-DLC).
