# Agentic AI 검증 체크리스트

## 목적
`agentic-ai-systems` 패턴이 `1dragon`의 실제 생성 파이프라인에 맞게 통합되었는지 검증한다.

검증 대상:
- agentic 전략 해석기
- `/api/v1/media/jobs` 요청/응답 계약
- BullMQ 생성 워커의 전략 적용
- 웹 위저드의 전략 미리보기와 요청 payload
- 기존 생성/재시도/DLQ 흐름의 회귀 여부

## 사전 조건
- 루트 경로: `/Users/inchan/workspace/1dragon`
- 의존성 설치 완료
- 명령은 모두 루트에서 실행
- `pnpm` 이 PATH에 없으면 아래 형식을 사용:

```bash
COREPACK_HOME=/tmp/corepack corepack pnpm <command>
```

권장 실행 도구:

```bash
COREPACK_HOME=/tmp/corepack corepack pnpm --filter @1dragon/api run validate:agentic:curl -- baseline
COREPACK_HOME=/tmp/corepack corepack pnpm --filter @1dragon/api run validate:agentic:smoke -- --cookie "$SESSION_COOKIE"
```

## A. 정적 검증

### 공용 전략 계층
- [ ] `COREPACK_HOME=/tmp/corepack corepack pnpm --filter @1dragon/shared test`
- [ ] `COREPACK_HOME=/tmp/corepack corepack pnpm --filter @1dragon/shared typecheck`

기대 결과:
- `packages/shared/src/agentic.ts` 의 모든 테스트 통과
- `AUTO / BASELINE / CHAIN / ORCHESTRATOR` 전략 해석 로직이 타입 포함 정상 동작

### API / Web 타입 검증
- [ ] `COREPACK_HOME=/tmp/corepack corepack pnpm --filter @1dragon/api typecheck`
- [ ] `COREPACK_HOME=/tmp/corepack corepack pnpm --filter @1dragon/web typecheck`

기대 결과:
- `agenticMode`, `agenticPlan`, `skipWearableComposite` 추가 후 타입 오류 없음

### API 회귀 테스트
- [ ] `COREPACK_HOME=/tmp/corepack corepack pnpm --filter @1dragon/api test`

기대 결과:
- media generate worker 테스트 통과
- pipeline integration 테스트 통과
- provider/router/retry/DLQ 관련 기존 테스트 회귀 없음

## B. 전략 해석기 케이스 매트릭스

### 1. Baseline
- [ ] 입력: `productCategory=OTHER`, 단일 플랫폼, 기본 카피
- [ ] 기대: `workflow=BASELINE`
- [ ] 기대: `features.shortformWorkflow=false`
- [ ] 기대: `features.wearableComposite=false`

### 2. Prompt Chain
- [ ] 입력: `productCategory=BEAUTY`, `keywords` 존재, 또는 `duration > 15`
- [ ] 기대: `workflow=PROMPT_CHAIN`
- [ ] 기대: `steps=analyze_brief -> build_prompt -> generate_video -> quality_gate`

### 3. Orchestrator-Workers
- [ ] 입력: `productCategory=FASHION`, `autoShortformWorkflow=true`
- [ ] 기대: `workflow=ORCHESTRATOR_WORKERS`
- [ ] 기대: `features.shortformWorkflow=true`
- [ ] 기대: `shortform_planner_worker` 포함

### 4. Wearable Composite
- [ ] 입력: `productCategory=ACCESSORIES`, `keywords` 에 `sneakers` 또는 `shoe` 포함
- [ ] 기대: `features.wearableComposite=true`
- [ ] 기대: `wearable_composite_worker` 포함

### 5. Manual Override
- [ ] 입력: `agenticMode=BASELINE`
- [ ] 기대: 다른 조건과 무관하게 `workflow=BASELINE`
- [ ] 입력: `agenticMode=CHAIN`
- [ ] 기대: `workflow=PROMPT_CHAIN`
- [ ] 입력: `agenticMode=ORCHESTRATOR`
- [ ] 기대: `workflow=ORCHESTRATOR_WORKERS`

## C. API 계약 검증

### 작업 생성 응답
- [ ] `POST /api/v1/media/jobs` 응답에 `agenticPlan` 이 포함된다
- [ ] `agenticPlan.mode`, `routing`, `workflow`, `reasoning`, `steps`, `features` 구조가 유지된다

권장 명령:

```bash
SESSION_COOKIE="better-auth.session_token=..." \
COREPACK_HOME=/tmp/corepack corepack pnpm --filter @1dragon/api run validate:agentic:curl -- orchestrator
```

### 중복 요청
- [ ] 동일 `idempotencyKey` 로 재요청 시 `isDuplicate=true`
- [ ] 중복 응답에서도 `agenticPlan` 이 동일하게 포함된다

### 큐 payload 전달
- [ ] `agenticMode` 가 있으면 `MediaGenerateJobData` 로 전달된다
- [ ] 서버에서 계산한 `agenticPlan` 이 queue payload 에 포함된다
- [ ] `skipWearableComposite` 값이 전달된다

## D. 워커 실행 검증

대상 파일:
- `apps/api/src/infrastructure/queue/workers/media-generate.worker.ts`

### Baseline 경로
- [ ] shortform workflow 미적용
- [ ] wearable composite 미적용
- [ ] 기존 generate-video.usecase 경로로 바로 진행

### Prompt Chain 경로
- [ ] prompt directives 에 prompt-chain 지시문이 추가된다
- [ ] workflow stages 에 `입력 분석`, `프롬프트 설계`, `영상 생성`, `품질 평가`가 반영된다

### Orchestrator 경로
- [ ] 조건 충족 시 wearable composite 전처리가 수행된다
- [ ] 조건 충족 시 shortform workflow 지시문이 적용된다
- [ ] 품질 게이트는 기존처럼 항상 수행된다

### 메타데이터 / SSE
- [ ] transition metadata 에 `agenticMode` 포함
- [ ] transition metadata 에 `agenticWorkflow` 포함
- [ ] transition metadata 에 `agenticRouting` 포함
- [ ] transition metadata 에 `agenticReasoning` 포함
- [ ] transition metadata 에 `agenticSteps` 포함

## E. 웹 수동 검증

대상 파일:
- `apps/web/src/widgets/video-creator/wizard.tsx`

### 스타일 단계
- [ ] Agentic 전략 카드가 노출된다
- [ ] 현재 입력값에 따라 `Baseline / Prompt Chain / Orchestrator-Workers` 라벨이 바뀐다
- [ ] reasoning 과 steps 가 표시된다

### 생성 요청 payload
- [ ] 분석 결과의 `moods`, `keywords` 가 생성 요청에 포함된다
- [ ] persona 선택 시 `personaId` 가 요청에 포함된다
- [ ] composite preview 가 이미 있으면 `skipWearableComposite=true` 로 전달된다

### 회귀
- [ ] 기존 업로드 -> 분석 -> 모델 선택 -> 스타일 -> 생성 -> 프리뷰 흐름이 유지된다
- [ ] 전략 카드 추가가 기존 사용자 플로우를 막지 않는다

## F. 수동 API 예시

인증이 필요한 엔드포인트이므로 브라우저 세션 쿠키 또는 테스트 세션이 필요하다.

예시 payload:

```json
{
  "imageUrl": "https://cdn.example.com/product.png",
  "stylePreset": "TRENDY",
  "platforms": ["TIKTOK"],
  "duration": 15,
  "productCategory": "FASHION",
  "keywords": ["ootd", "spring"],
  "agenticMode": "AUTO",
  "autoShortformWorkflow": true,
  "copy": {
    "hook": "봄룩 시작",
    "description": "플로럴 원피스",
    "cta": "지금 확인"
  }
}
```

검증 포인트:
- [ ] 응답 `agenticPlan.workflow=ORCHESTRATOR_WORKERS`
- [ ] `features.shortformWorkflow=true`
- [ ] `steps` 에 `shortform_planner_worker` 포함

## G. 완료 기준
- [ ] shared test 통과
- [ ] shared/api/web typecheck 통과
- [ ] api test 통과
- [ ] 대표 케이스 5종이 기대 workflow 로 라우팅
- [ ] 웹 표시 전략과 서버 실제 전략이 일치
- [ ] SSE / job event metadata 에 agentic 정보가 남는다
- [ ] 기존 생성/재시도/DLQ 흐름 회귀 없음

## 참고 문서
- [AGENTIC_AI_SYSTEMS.md](/Users/inchan/workspace/1dragon/docs/05-architecture/AGENTIC_AI_SYSTEMS.md)
- [media-generate.worker.ts](/Users/inchan/workspace/1dragon/apps/api/src/infrastructure/queue/workers/media-generate.worker.ts)
- [job-routes.ts](/Users/inchan/workspace/1dragon/apps/api/src/api/media/job-routes.ts)
- [agentic.ts](/Users/inchan/workspace/1dragon/packages/shared/src/agentic.ts)
