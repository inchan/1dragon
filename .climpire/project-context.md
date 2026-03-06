# Project: 1dragon

## Tech Stack
Node.js >=20.0.0

## File Structure
```
├── apps/
│   ├── api/
│   │   ├── drizzle/
│   │   │   └── migrations/
│   │   │       ...
│   │   ├── scripts/
│   │   │   ├── output/
│   │   │   │   ...
│   │   │   └── test-veo-pipeline.ts
│   │   ├── src/
│   │   │   ├── api/
│   │   │   │   ...
│   │   │   ├── application/
│   │   │   │   ...
│   │   │   ├── domain/
│   │   │   │   ...
│   │   │   ├── infrastructure/
│   │   │   │   ...
│   │   │   ├── shared/
│   │   │   │   ...
│   │   │   ├── main.ts
│   │   │   └── sentry.ts
│   │   ├── drizzle-kit.config.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── vitest.config.ts
│   └── web/
│       ├── e2e/
│       │   └── example.spec.ts
│       ├── scripts/
│       │   └── check-i18n.mjs
│       ├── src/
│       │   ├── features/
│       │   │   ...
│       │   ├── lib/
│       │   │   ...
│       │   ├── locales/
│       │   │   ...
│       │   ├── pages/
│       │   │   ...
│       │   ├── widgets/
│       │   │   ...
│       │   ├── App.tsx
│       │   ├── i18n.ts
│       │   ├── main.tsx
│       │   ├── routeTree.gen.ts
│       │   ├── sentry.ts
│       │   └── vite-env.d.ts
│       ├── test-results/
│       ├── eslint.config.js
│       ├── index.html
│       ├── package.json
│       ├── playwright.config.ts
│       ├── tsconfig.json
│       ├── tsconfig.tsbuildinfo
│       ├── vite.config.ts
│       └── vitest.config.ts
├── artifacts/
│   ├── generated/
│   │   ├── fashion-001-veo-2026-02-19T08-16-39-615Z.json
│   │   ├── fashion-001-veo-2026-02-19T08-16-39-615Z.mp4
│   │   ├── real-photo-video-2026-02-19T07-05-01-280Z.json
│   │   └── real-photo-video-2026-02-19T07-05-01-280Z.mp4
│   ├── veo-fashion-001-20260218-233438.mp4
│   ├── veo-fashion-001-improved-20260219-101252.mp4
│   └── veo-real-20260218-180138.mp4
├── docs/
│   ├── 01-research/
│   │   ├── raw/
│   │   │   ├── ai-tech-report/
│   │   │   │   ...
│   │   │   ├── personas/
│   │   │   │   ...
│   │   │   ├── AI_영상생성_비용분석_2025년2월.md
│   │   │   ├── personas.md
│   │   │   ├── shortform_commerce_2024_2025.md
│   │   │   ├── user-journey-map.md
│   │   │   └── 상품이미지_AI기술_조사보고서_2025_02.md
│   │   ├── user-research/
│   │   │   ├── 01-personas.md
│   │   │   ├── 02-market-size.md
│   │   │   ├── 03-needs-analysis.md
│   │   │   ├── 04-pricing-sensitivity.md
│   │   │   ├── 05-platform-specs.md
│   │   │   ├── 06-strategic-implications.md
│   │   │   ├── 07-source-links.md
│   │   │   └── hub.md
│   │   ├── MARKET_RESEARCH.md
│   │   ├── TECH_RESEARCH.md
│   │   └── USER_RESEARCH.md
│   ├── 02-strategy/
│   │   ├── gtm/
│   │   │   ├── 01-launch-growth.md
│   │   │   ├── 02-partnerships-content.md
│   │   │   └── 03-global-kpi-budget.md
│   │   ├── BUSINESS_MODEL.md
│   │   ├── GTM_STRATEGY.md
│   │   └── VISION.md
│   ├── 03-product/
│   │   ├── prd/
│   │   │   ├── 01-epics-stories.md
│   │   │   ├── 02-functional-requirements.md
│   │   │   └── 03-nfr-architecture.md
│   │   ├── templates/
│   │   │   ├── ab_test_matrix.csv
│   │   │   ├── production_callsheet_7day.md
│   │   │   └── shortform_15s_shotlist.csv
│   │   ├── user-flows/
│   │   │   ├── 01-onboarding-generation.md
│   │   │   ├── 02-edit-export-payment.md
│   │   │   └── 03-error-batch.md
│   │   ├── FEATURE_SPEC.md
│   │   ├── INFLUENCER_AD_WORKFLOW_EXECUTION.md
│   │   ├── MVP_SCOPE.md
│   │   ├── PRD.md
│   │   ├── SHORTFORM_COMMERCE_PRODUCTION_SOP.md
│   │   └── USER_FLOWS.md
│   ├── 04-simulation/
│   │   ├── decision-tree/
│   │   │   ├── 01-analysis.md
│   │   │   ├── 02-scenarios.md
│   │   │   ├── 03-guide.md
│   │   │   └── hub.md
│   │   ├── dialectic/
│   │   ├── dialectic-analysis/
│   │   │   ├── 01-red-team.md
│   │   │   ├── 02-blue-team.md
│   │   │   ├── 03-synthesis.md
│   │   │   └── hub.md
│   │   ├── stakeholder/
│   │   ├── stakeholder-simulation/
│   │   │   ├── 01-perspectives.md
│   │   │   ├── 02-conflicts.md
│   │   │   ├── 03-resolutions.md
│   │   │   └── hub.md
│   │   ├── DECISION_TREE.md
│   │   ├── DIALECTIC_ANALYSIS.md
│   │   └── STAKEHOLDER_SIMULATION.md
│   ├── 05-architecture/
│   │   ├── GAP_ANALYSIS_REPORT.md
│   │   ├── INITIAL_DESIGN.md
│   │   └── REVISED_DESIGN.md
│   ├── 06-operations/
│   │   ├── P0_RELIABILITY_PORT_CONTRACT.md
│   │   ├── P0_RELIABILITY_QA_CHECKLIST.md
│   │   ├── P0_RELIABILITY_RUNBOOK.md
│   │   └── 1DRAGON_STRUCTURE_GAP_PLAN_2026-02-24.md
│   ├── INDEX.md
│   └── PROJECT_SUMMARY.md
├── openspec/
│   ├── changes/
│   │   ├── archive/
│   │   │   ├── 2026-02-13-remove-unused-api-barrels-and-di-files/
│   │   │   │   ...
│   │   │   ├── 2026-02-14-centralize-version-config/
│   │   │   │   ...
│   │   │   ├── 2026-02-14-harden-api-response-parsing/
│   │   │   │   ...
│   │   │   ├── 2026-02-14-harden-i2v-json-parsing/
│   │   │   │   ...
│   │   │   ├── 2026-02-14-harden-media-route-error-logging/
│   │   │   │   ...
│   │   │   ├── 2026-02-14-harden-webhook-stream-parsing-and-platform-mapping/
│   │   │   │   ...
│   │   │   ├── 2026-02-14-normalize-db-connection-logging/
│   │   │   │   ...
│   │   │   ├── 2026-02-14-seed-logging-standardization/
│   │   │   │   ...
│   │   │   ├── 2026-02-14-standardize-remaining-console-logs/
│   │   │   │   ...
│   │   │   ├── 2026-02-14-validation-error-response-consistency/
│   │   │   │   ...
│   │   │   └── 2026-02-15-1dragon-mvp-foundation/
│   │   │       ...
│   │   └── fix-video-generation-endpoint-and-worker-pipeline/
│   │       ├── specs/
│   │       │   ...
│   │       ├── design.md
│   │       ├── proposal.md
│   │       └── tasks.md
│   ├── specs/
│   │   ├── billing/
│   │   │   └── spec.md
│   │   ├── cleanup-unused-files/
│   │   │   └── spec.md
│   │   ├── console-log-standardization/
│   │   │   └── spec.md
│   │   ├── content-generation/
│   │   │   └── spec.md
│   │   ├── db-connection-logging/
│   │   │   └── spec.md
│   │   ├── i2v-parsing/
│   │   │   └── spec.md
│   │   ├── image-analysis/
│   │   │   └── spec.md
│   │   ├── media-route-error-logging/
│   │   │   └── spec.md
│   │   ├── model-persona/
│   │   │   └── spec.md
│   │   ├── notification/
│   │   │   └── spec.md
│   │   ├── parser-hardening/
│   │   │   └── spec.md
│   │   ├── project-setup/
│   │   │   └── spec.md
│   │   ├── response-parsing/
│   │   │   └── spec.md
│   │   ├── route-validation/
│   │   │   └── spec.md
│   │   ├── seed-logging/
│   │   │   └── spec.md
│   │   ├── user-management/
│   │   │   └── spec.md
│   │   ├── version-config/
│   │   │   └── spec.md
│   │   ├── video-generation/
│   │   │   └── spec.md
│   │   └── video-output/
│   │       └── spec.md
│   └── config.yaml
├── packages/
│   ├── config/
│   │   ├── src/
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── shared/
│   │   ├── src/
│   │   │   ├── schemas/
│   │   │   │   ...
│   │   │   ├── enums.ts
│   │   │   ├── errors.ts
│   │   │   ├── index.ts
│   │   │   ├── result.ts
│   │   │   └── utils.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── vitest.config.ts
│   └── ui/
│       ├── src/
│       │   ├── components/
│       │   │   ...
│       │   ├── lib/
│       │   │   ...
│       │   ├── utils/
│       │   │   ...
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
├── tooling/
│   ├── biome/
│   │   ├── biome.json
│   │   └── package.json
│   ├── eslint/
│   │   ├── index.js
│   │   └── package.json
│   └── typescript/
│       ├── base.json
│       ├── node.json
│       ├── package.json
│       └── react.json
├── .env.example
├── AGENT.md
├── AGENTS.md
├── biome.json
├── CLAUDE.md
├── docker-compose.yml
├── package.json
├── pnpm-workspace.yaml
├── README.md
└── turbo.json
```

## Key Files
- package.json (680 bytes)
- docker-compose.yml (723 bytes)
- .env.example (1293 bytes)

## README (first 20 lines)
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

