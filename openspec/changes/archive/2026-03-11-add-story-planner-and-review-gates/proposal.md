## Why

현재 영상 생성은 같은 상품 이미지에 대해 거의 같은 구조와 비슷한 움직임의 결과로 수렴하고 있습니다. 제품 정체성 보존은 강하지만, 실제로는 훅, 증명 장면, 감정적 payoff, CTA가 분리된 "이야기"가 만들어지지 않아 사용자가 기대하는 숏폼 광고성과 차이가 큽니다.

## What Changes

- 생성 파이프라인 앞단에 `story brief -> concept -> shot cards`를 만드는 스토리 플래너 계층을 추가합니다.
- 각 단계에서 자기비판 리뷰를 수행하고, 리뷰에서 제기한 주장에 대해 사실검증을 통과해야만 다음 단계로 진행하는 게이트를 추가합니다.
- 동일 입력 이미지를 반복 생성할 때 카메라 미세변형만 다른 결과가 아니라, 훅/장면 의도/증명 방식/CTA가 달라지는 서사 다양성 정책을 추가합니다.
- 기존 고정 `INTRO / DETAIL / CTA` 구조를 "계획된 shot plan" 기반 생성으로 전환합니다.
- 리뷰/검증 산출물을 로그 또는 영속 산출물로 남겨, 왜 특정 콘셉트가 선택되었는지 추적 가능하게 합니다.

## Capabilities

### New Capabilities
- `story-planning`: 생성 전에 story brief, concept family, shot cards를 만들어 서사 중심 숏폼 계획을 수립한다.
- `creative-review-gates`: 각 생성 단계에서 자기비판 리뷰와 사실검증 게이트를 실행하고, 통과한 산출물만 다음 단계로 전달한다.

### Modified Capabilities
- `video-generation`: 기존 고정 컷/프롬프트 중심 생성 흐름을 story plan 기반 생성과 다양성 정책을 포함하는 흐름으로 변경한다.

## Impact

- 영향 코드: `apps/api/src/application/media/generate-video.usecase.ts`, `apps/api/src/application/media/shortform-workflow.ts`, `apps/api/src/infrastructure/media/prompt-builder.ts`, 관련 worker/quality/evaluator 계층
- 영향 산출물: 프롬프트 입력 구조, 생성 단계 메타데이터, 리뷰 로그, 디버깅/검증 리포트
- 영향 동작: 동일 입력 반복 생성 시 콘셉트 다양성 증가, 단계별 리뷰로 저품질/무서사 결과 조기 차단
- 의존성: 기존 image analysis, copy, provider router, 품질 평가 계층과 연결되며 필요 시 LLM 기반 planner/reviewer 추가 가능
