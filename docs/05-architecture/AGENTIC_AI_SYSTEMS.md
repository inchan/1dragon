# Agentic AI Systems Integration

`1dragon`은 이미 `web -> api -> BullMQ worker -> provider adapters -> quality control` 흐름을 갖고 있었고, `agentic-ai-systems` 레포는 그 위에 올릴 수 있는 실행 패턴 레퍼런스였습니다. 이번 통합은 그 레퍼런스를 그대로 벤더링하는 대신, 현재 숏폼 영상 생성 파이프라인에 맞는 실행 계층으로 재구성한 것입니다.

## 프로젝트 이해 요약

- 사용자 진입점은 [apps/web/src/widgets/video-creator/wizard.tsx](/Users/inchan/workspace/1dragon/apps/web/src/widgets/video-creator/wizard.tsx) 입니다.
- API 진입점은 [apps/api/src/api/media/job-routes.ts](/Users/inchan/workspace/1dragon/apps/api/src/api/media/job-routes.ts) 의 `/api/v1/media/jobs` 입니다.
- 실제 생성은 [apps/api/src/infrastructure/queue/workers/media-generate.worker.ts](/Users/inchan/workspace/1dragon/apps/api/src/infrastructure/queue/workers/media-generate.worker.ts) 에서 수행됩니다.
- 품질 평가는 [apps/api/src/application/media/generate-video.usecase.ts](/Users/inchan/workspace/1dragon/apps/api/src/application/media/generate-video.usecase.ts) 와 `QualityControlService` 가 담당합니다.

## agentic-ai-systems 패턴 매핑

- `Baseline`
  - 단순 단일 플랫폼 요청은 추가 오케스트레이션 없이 바로 생성합니다.
- `Prompt Chaining`
  - 입력 분석 -> 프롬프트 설계 -> 영상 생성 -> 품질 평가 순서의 단계형 지시를 프롬프트에 반영합니다.
- `Routing`
  - 요청 특성에 따라 어떤 워크플로를 사용할지 [packages/shared/src/agentic.ts](/Users/inchan/workspace/1dragon/packages/shared/src/agentic.ts) 에서 자동 결정합니다.
- `Orchestrator-Workers`
  - 착장 합성, 숏폼 플래너, 영상 생성 워커를 조합해야 하는 요청은 오케스트레이터 전략으로 실행합니다.
- `Evaluator-Optimizer`
  - 최종 결과는 기존 품질 게이트를 통해 통과 여부가 결정됩니다.

## 새로 추가된 통합 지점

- 공용 전략 해석기: [packages/shared/src/agentic.ts](/Users/inchan/workspace/1dragon/packages/shared/src/agentic.ts)
- API 계약 확장: [packages/shared/src/schemas/media.ts](/Users/inchan/workspace/1dragon/packages/shared/src/schemas/media.ts)
- 작업 생성 시 전략 계산: [apps/api/src/api/media/job-routes.ts](/Users/inchan/workspace/1dragon/apps/api/src/api/media/job-routes.ts)
- 워커 실행 시 전략 적용: [apps/api/src/infrastructure/queue/workers/media-generate.worker.ts](/Users/inchan/workspace/1dragon/apps/api/src/infrastructure/queue/workers/media-generate.worker.ts)
- 웹 전략 미리보기: [apps/web/src/widgets/video-creator/wizard.tsx](/Users/inchan/workspace/1dragon/apps/web/src/widgets/video-creator/wizard.tsx)

## 현재 동작 방식

1. 웹은 현재 입력값으로 agentic 실행 계획을 미리 계산해 사용자에게 보여줍니다.
2. `/api/v1/media/jobs` 는 같은 계획을 서버에서 다시 계산해 응답과 큐 payload 에 포함합니다.
3. 생성 워커는 그 계획에 따라 baseline, prompt-chain, orchestrator-workers 중 하나를 적용합니다.
4. 모든 경로는 기존 품질 평가 단계로 종료됩니다.

## 의도적으로 남겨둔 범위

- 외부 레포는 Claude Code 중심 문서 레포이므로, 실제 런타임 서브에이전트 프로세스를 추가하지는 않았습니다.
- 대신 현재 코드베이스의 `Hono + BullMQ + provider adapters` 구조를 유지하면서, 패턴만 실행 가능한 형태로 이식했습니다.
