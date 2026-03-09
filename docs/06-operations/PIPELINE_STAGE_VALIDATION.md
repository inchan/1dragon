# Pipeline Stage Validation

> 목적: 현재 1dragon의 핵심 사용자 여정과 생성 파이프라인을 가장 작은 단계로 분해하고, 각 단계마다 `프로세스 검증`과 `실제 아웃풋 검증`이 어디까지 확보되어 있는지 판단한다.

## 검증 기준

- `검증 완료`: 프로세스와 산출물 둘 다 테스트 또는 실행 증거가 있다.
- `부분 검증`: 코드 경로는 명확하지만 프로세스/산출물 중 한쪽 증거가 약하다.
- `미검증`: 구현은 있으나 테스트나 실행 증거가 사실상 없다.

## 이번에 다시 실행한 대표 테스트

- `COREPACK_HOME=/tmp/corepack corepack pnpm --filter @1dragon/shared test -- src/agentic.test.ts`
- `COREPACK_HOME=/tmp/corepack corepack pnpm --filter @1dragon/api test -- src/application/media/generate-video.usecase.test.ts src/application/media/render-variants.usecase.test.ts src/infrastructure/media/prompt-builder.test.ts src/application/media/shortform-workflow.test.ts src/infrastructure/queue/workers/media-generate.worker.test.ts`
- `COREPACK_HOME=/tmp/corepack corepack pnpm --filter @1dragon/web test -- src/widgets/video-creator/wizard-reducer.test.ts src/features/notification/use-job-stream.test.tsx`

결과:
- shared 1 file / 6 tests passed
- api 5 files / 17 tests passed
- web 2 files / 49 tests passed

## 단계별 검증

### 1. 파일 선택과 업로드 단계 진입
- 프로세스 검증: [wizard-reducer.ts](../../apps/web/src/widgets/video-creator/wizard-reducer.ts), [wizard-reducer.test.ts](../../apps/web/src/widgets/video-creator/wizard-reducer.test.ts)에서 `PICK_FILE`, `SET_STEP` 동작과 분석/합성 상태 초기화를 검증한다.
- 실제 아웃풋 검증: 새 파일 선택 시 `previewUrl`이 바뀌고 이전 분석 결과, persona composite URL이 초기화되는 것을 테스트가 직접 확인한다.
- 판정: `검증 완료`
- 갭: 실제 브라우저 업로드 UI 수준의 통합 테스트는 없다.

### 2. 분석 요청 페이로드 조립
- 프로세스 검증: [wizard.tsx](../../apps/web/src/widgets/video-creator/wizard.tsx)에서 `api.analyzeProduct()` 호출 시 `image`, `productName`, `category`를 조립한다. [api.ts](../../apps/web/src/lib/api.ts)에서 multipart `FormData`로 전송한다.
- 실제 아웃풋 검증: 별도 테스트 없음.
- 판정: `부분 검증`
- 갭: 웹에서 실제 multipart payload가 올바르게 만들어지는지에 대한 테스트가 없다.

### 3. 분석 API 인증과 multipart 유효성 검사
- 프로세스 검증: [products/routes.ts](../../apps/api/src/api/products/routes.ts)에서 인증, multipart 파싱, zod body 검증, 파일 존재/MIME/용량 제한, 이미지 해상도 검사까지 수행한다.
- 실제 아웃풋 검증: 별도 라우트 테스트 없음.
- 판정: `부분 검증`
- 갭: 401, 400, 413, 500 응답이 계약대로 나가는지 자동 검증이 없다.

### 4. 이미지 정규화와 원본 업로드
- 프로세스 검증: [products/routes.ts](../../apps/api/src/api/products/routes.ts)에서 `sharp`로 회전/metadata 정규화 후 S3 업로드를 수행한다.
- 실제 아웃풋 검증: 별도 테스트 없음.
- 판정: `부분 검증`
- 갭: 업로드된 파일의 실제 해상도/포맷/오브젝트 키 규칙을 검증하는 테스트가 없다.

### 5. 비전 분석, 업스케일, 배경 제거, 생성 이미지 준비
- 프로세스 검증: [analyze-image.usecase.ts](../../apps/api/src/application/product/analyze-image.usecase.ts)에 1차/폴백 비전 분석, 해상도 기반 업스케일, 배경 제거 폴백, 생성용 프롬프트 구성 로직이 있다.
- 실제 아웃풋 검증: 별도 테스트 없음.
- 판정: `부분 검증`
- 갭: 가장 중요한 분석 코어인데 현재 use case 테스트가 없다.

### 6. 분석 결과 영속화와 응답 매핑
- 프로세스 검증: [products/routes.ts](../../apps/api/src/api/products/routes.ts)에서 repository 저장 후 `ProductAnalysisResponse` + `queue` 메시지로 응답을 만든다.
- 실제 아웃풋 검증: 별도 테스트 없음.
- 판정: `부분 검증`
- 갭: DB 레코드와 API 응답 간 매핑이 맞는지 회귀 검증이 없다.

### 7. 분석 완료 후 위저드 분기
- 프로세스 검증: [wizard-reducer.ts](../../apps/web/src/widgets/video-creator/wizard-reducer.ts), [wizard-reducer.test.ts](../../apps/web/src/widgets/video-creator/wizard-reducer.test.ts)에서 `ANALYZE_SUCCESS`가 `MODEL` 또는 `STYLE`로 분기되는지 검증한다.
- 실제 아웃풋 검증: 분석 결과 저장, 카테고리 반영, 카피 variant 교체, 다음 step 이동이 테스트에 직접 나온다.
- 판정: `검증 완료`
- 갭: 실제 API 응답과 reducer 연결까지 포함한 컴포넌트 테스트는 없다.

### 8. Persona 선택과 composite preview 분기
- 프로세스 검증: [wizard.tsx](../../apps/web/src/widgets/video-creator/wizard.tsx)에서 분석 결과의 `originalImageUrl`을 기준으로 `generateModelComposite()`를 호출하고, 성공/실패에 따라 composite preview를 업데이트한다.
- 실제 아웃풋 검증: worker 레벨에서는 [media-generate.worker.test.ts](../../apps/api/src/infrastructure/queue/workers/media-generate.worker.test.ts)로 composite 적용 여부를 검증하지만, 웹 preview 자체는 테스트가 없다.
- 판정: `부분 검증`
- 갭: composite preview UI와 API 간 연결 검증이 없다.

### 9. 생성 요청 페이로드 조립
- 프로세스 검증: [wizard.tsx](../../apps/web/src/widgets/video-creator/wizard.tsx), [api.ts](../../apps/web/src/lib/api.ts)에서 `imageUrl`, `stylePreset`, `platforms`, `personaId`, `moods`, `keywords`, `copy`, `agenticMode`, `autoShortformWorkflow`, `skipWearableComposite`를 묶어 `/api/v1/media/jobs`로 보낸다.
- 실제 아웃풋 검증: 별도 테스트 없음.
- 판정: `부분 검증`
- 갭: composite가 이미 있으면 `skipWearableComposite=true`가 실제 요청에 들어가는지 자동 검증이 없다.

### 10. Agentic 전략 해석
- 프로세스 검증: [agentic.ts](../../packages/shared/src/agentic.ts), [agentic.test.ts](../../packages/shared/src/agentic.test.ts)에서 baseline / prompt-chain / orchestrator-workers 라우팅 조건을 검증한다.
- 실제 아웃풋 검증: 테스트가 `workflow`, `reasoning`, `steps`, `features` 전체 객체를 단언한다.
- 판정: `검증 완료`
- 갭: 실제 job route 응답에 이 plan이 포함되는 API 레벨 테스트는 없다.

### 11. 생성 API 유효성 검사, idempotency, job 생성
- 프로세스 검증: [job-routes.ts](../../apps/api/src/api/media/job-routes.ts)에서 body 검증, deterministic job id 생성, 중복 job 조회, DB 생성, queue payload 조립을 수행한다.
- 실제 아웃풋 검증: 별도 라우트 테스트 없음.
- 판정: `부분 검증`
- 갭: 중복 요청 시 동일 job 반환, `agenticPlan` 포함, payload 전달 여부를 자동 검증하지 못하고 있다.

### 12. 큐 적재와 초기 status event 발행
- 프로세스 검증: [job-routes.ts](../../apps/api/src/api/media/job-routes.ts)에서 BullMQ enqueue, job status update, `appendJobStatusEvent()` 호출을 수행한다.
- 실제 아웃풋 검증: 별도 라우트 테스트 없음.
- 판정: `부분 검증`
- 갭: enqueue 성공/실패 응답, job event DB 적재까지 묶은 테스트가 없다.

### 13. 워커의 입력 정규화와 전략 적용
- 프로세스 검증: [media-generate.worker.ts](../../apps/api/src/infrastructure/queue/workers/media-generate.worker.ts), [media-generate.worker.test.ts](../../apps/api/src/infrastructure/queue/workers/media-generate.worker.test.ts)에서 기본값 보정, productCategory/moods/keywords/copy 전달, agentic plan 적용을 검증한다.
- 실제 아웃풋 검증: 테스트가 `GenerateVideoUseCase`에 전달되는 실제 입력값을 단언한다.
- 판정: `검증 완료`
- 갭: DB 레코드와 payload가 실제 운영 환경에서 일치하는 end-to-end 검증은 없다.

### 14. 숏폼 workflow 확장
- 프로세스 검증: [shortform-workflow.ts](../../apps/api/src/application/media/shortform-workflow.ts), [shortform-workflow.test.ts](../../apps/api/src/application/media/shortform-workflow.test.ts), [media-generate.worker.test.ts](../../apps/api/src/infrastructure/queue/workers/media-generate.worker.test.ts)에서 fashion 카테고리 확장 규칙을 검증한다.
- 실제 아웃풋 검증: 테스트가 `workflowStages`, 확장된 `keywords`, CTA, prompt directives 내 위치/페르소나 텍스트를 단언한다.
- 판정: `검증 완료`
- 갭: trend source 링크의 최신성은 정적 하드코딩 상태라 별도 운영 검증이 필요하다.

### 15. Wearable composite 전처리
- 프로세스 검증: [media-generate.worker.ts](../../apps/api/src/infrastructure/queue/workers/media-generate.worker.ts), [media-generate.worker.test.ts](../../apps/api/src/infrastructure/queue/workers/media-generate.worker.test.ts)에서 fashion/accessories footwear 조건 시 composite 생성 후 입력 이미지를 교체한다.
- 실제 아웃풋 검증: 테스트가 `inputImageUrl`이 composite URL로 바뀌는 것을 직접 확인한다.
- 판정: `검증 완료`
- 갭: composite 품질이 낮을 때 원본 fallback이 UX에 어떻게 보이는지는 웹 레벨 검증이 없다.

### 16. 프롬프트 구성
- 프로세스 검증: [prompt-builder.ts](../../apps/api/src/infrastructure/media/prompt-builder.ts), [prompt-builder.test.ts](../../apps/api/src/infrastructure/media/prompt-builder.test.ts)에서 provider별 프롬프트, cold-open, UGC realism, workflow directives 반영을 검증한다.
- 실제 아웃풋 검증: 테스트가 provider 문자열, keyword/style/copy 반영, workflow stage/directive 삽입을 단언한다.
- 판정: `검증 완료`
- 갭: 실제 외부 I2V 모델의 프롬프트 품질은 모의 테스트만 있고 실서비스 샘플 검증은 없다.

### 17. 배경 제거, 클립 생성, 마스터 합성
- 프로세스 검증: [generate-video.usecase.ts](../../apps/api/src/application/media/generate-video.usecase.ts), [generate-video.usecase.test.ts](../../apps/api/src/application/media/generate-video.usecase.test.ts), [pipeline-integration.test.ts](../../apps/api/src/application/media/pipeline-integration.test.ts)에서 상태 전이와 end-to-end orchestration을 검증한다.
- 실제 아웃풋 검증: 테스트가 `events` 수, `masterAsset.url`, 상태 전이 순서를 단언한다. 통합 테스트는 FREE 플랜 2클립과 워터마크까지 검증하지만 외부 이미지 파일 의존 구간 일부는 skip 가능하다.
- 판정: `검증 완료`
- 갭: 실 provider 호출 기반의 영상 샘플 검증은 없다.

### 18. 플랫폼 variant 렌더링
- 프로세스 검증: [render-variants.usecase.ts](../../apps/api/src/application/media/render-variants.usecase.ts), [render-variants.usecase.test.ts](../../apps/api/src/application/media/render-variants.usecase.test.ts)에서 plan tier에 따른 variant 수를 검증한다.
- 실제 아웃풋 검증: FREE는 1개, STARTER는 3개 variant와 watermark 플래그 차이를 테스트가 직접 확인한다.
- 판정: `검증 완료`
- 갭: 실제 해상도/safe zone 렌더 결과물의 시각적 검증은 없다.

### 19. 품질 게이트와 최종 상태 결정
- 프로세스 검증: [quality-control.ts](../../apps/api/src/application/media/quality-control.ts), [generate-video.usecase.ts](../../apps/api/src/application/media/generate-video.usecase.ts), [media-generate.worker.test.ts](../../apps/api/src/infrastructure/queue/workers/media-generate.worker.test.ts)에서 similarity 기반 pass/regenerate/fail 흐름을 사용한다.
- 실제 아웃풋 검증: worker 테스트가 `SUCCEEDED`, retryable error rethrow, terminal failure의 DLQ 라우팅을 검증한다.
- 판정: `검증 완료`
- 갭: similarity가 URL 해시 기반이어서 실제 영상 품질을 대표하지 못한다.

### 20. 상태 영속화, job event 기록, SSE 발행
- 프로세스 검증: [media-generate.worker.ts](../../apps/api/src/infrastructure/queue/workers/media-generate.worker.ts), [stream-routes.ts](../../apps/api/src/api/media/stream-routes.ts), [helpers.ts](../../apps/api/src/api/media/helpers.ts), [media-generate.worker.test.ts](../../apps/api/src/infrastructure/queue/workers/media-generate.worker.test.ts)에서 상태 저장, event 적재, SSE publish를 수행한다.
- 실제 아웃풋 검증: worker 테스트가 transition 수만큼 `sseBroker.publish()`가 호출되는지 검증한다.
- 판정: `검증 완료`
- 갭: 실제 SSE HTTP stream이 브라우저에서 끊김 없이 전달되는 서버 통합 테스트는 없다.

### 21. 클라이언트의 SSE 수신과 polling fallback
- 프로세스 검증: [use-job-stream.ts](../../apps/web/src/features/notification/use-job-stream.ts), [use-job-stream.test.tsx](../../apps/web/src/features/notification/use-job-stream.test.tsx)에서 SSE 수신, query cache 반영, disconnect 시 polling fallback을 검증한다.
- 실제 아웃풋 검증: 테스트가 `GENERATING` 상태 반영과 polling 후 `SUCCEEDED` 상태 반영을 직접 확인한다.
- 판정: `검증 완료`
- 갭: 실제 API와 EventSource를 붙인 브라우저 통합 테스트는 없다.

### 22. 변형 영상 조회와 preview 상태 반영
- 프로세스 검증: [job-routes.ts](../../apps/api/src/api/media/job-routes.ts)에서 `/jobs/:jobId`가 events + variants를 반환하고, [wizard.tsx](../../apps/web/src/widgets/video-creator/wizard.tsx)에서 이를 `VideoVariantItem[]`으로 매핑한다.
- 실제 아웃풋 검증: reducer는 variant 상태 변경을 검증하지만, API 응답과 UI 매핑을 묶은 테스트는 없다.
- 판정: `부분 검증`
- 갭: `SUCCEEDED -> variants fetch -> PREVIEW` 전체 흐름의 컴포넌트 테스트가 없다.

### 23. 최종 결과 페이지와 공유 표면
- 프로세스 검증: [pages/studio/result/$jobId.tsx](../../apps/web/src/pages/studio/result/$jobId.tsx)는 현재 jobId만 읽고 정적 `VARIANTS` 샘플을 렌더링한다.
- 실제 아웃풋 검증: 관련 테스트 없음.
- 판정: `미검증`
- 갭: 현재 결과 페이지는 실제 job API와 연결되지 않았고, 실산출물 검증도 불가능하다.

## 종합 판정

### 강하게 검증된 영역
- agentic routing
- shortform workflow 확장
- wearable composite 워커 분기
- 프롬프트 빌드
- 생성 use case 상태 전이
- variant 렌더링
- SSE 소비와 polling fallback
- wizard reducer 상태 전이

### 부분 검증에 머무는 영역
- 웹 요청 payload 조립
- product analyze API 라우트
- media jobs API 라우트
- variants fetch 후 preview 연결
- composite preview UI

### 가장 큰 미검증 영역
- 실제 분석 API end-to-end
- 실제 job 생성 API end-to-end
- 결과 페이지 실데이터 연동
- 실 provider 산출 영상 품질 검증

## 바로 다음 검증 우선순위

1. `products/analyze` 라우트 테스트 추가: 인증, 파일 형식, 용량, 성공 응답 매핑 검증
2. `media/jobs` 라우트 테스트 추가: idempotency, `agenticPlan`, queue payload, enqueue 실패 경로 검증
3. `wizard.tsx` 컴포넌트 테스트 추가: 분석 응답 반영, composite preview, `skipWearableComposite`, job 생성 요청 payload 검증
4. `studio/result/$jobId`를 실제 API 기반으로 교체하고 결과 페이지 테스트 추가
5. live smoke test 수행: 실제 세션 쿠키와 API 서버를 붙여 `분석 -> job 생성 -> SSE -> variants 조회`까지 검증
