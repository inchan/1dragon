## 1. API 런타임 고정

- [x] 1.1 `apps/api/src/main.ts`에서 기존 `export default { port, fetch: app.fetch }` 의존 패턴을 제거하고, `listen` 기반 단일 HTTP 부트스트랩으로 변경한다.
- [x] 1.2 부트스트랩 경로에서 애플리케이션 라이프사이클 훅을 추가해 서버 시작/종료 시점 로깅과 정리 동작을 일관되게 등록한다.
- [x] 1.3 `/health` 경로를 최소 보장 응답으로 강화해 정상 응답(서비스 상태 + 기본 종속성 상태)을 반환하도록 조정한다.

## 2. 생성 API 및 상태 조회 정합성

- [x] 2.1 `apps/api/src/api/media/routes.ts`에 인증된 영상 생성 요청 엔드포인트를 추가/보강한다.
- [x] 2.2 생성 요청 payload(stage/token/input) 스키마 검증을 강화하고, 유효하지 않은 요청에 대해 명확한 실패 응답을 반환한다.
- [x] 2.3 생성 API가 안정적인 `jobId`를 반환하도록 설계하고, 중복 제출 방지를 위한 멱등성 처리(요청 ID 또는 토큰 기반)를 적용한다.
- [x] 2.4 `/api/v1/media/jobs/:jobId` 상태 조회 API를 정의/보강해 status, progress, timestamps, error 필드를 일관된 스키마로 제공한다.
- [x] 2.5 스트림/폴링 경로(`/jobs/:jobId/stream`, `/jobs/:jobId`)가 동일한 최종 상태 순서를 보장하도록 계약을 맞춘다.

## 3. 큐 enqueue + 워커 오케스트레이션

- [x] 3.1 큐 적재 지점에서 `media:generate`(또는 기존 큐다큐먼트 규칙의 큐명)로 잡을 enqueue하고 요청 메타데이터를 저장한다.
- [x] 3.2 워커 시작점을 애플리케이션 라이프사이클에 연결해 `generate`, `compose`, `render-variant` 워커를 초기화한다.
- [x] 3.3 워커 처리 중 단계별 상태 전환(queued → running → rendering → completed/failed)을 DB 또는 영속 스토어에 기록한다.
- [x] 3.4 실패/재시도 정책을 적용해 에러 메시지, 재시도 가능 플래그, 마지막 에러 원인을 상태 응답에 반영한다.
- [x] 3.5 이벤트 발행 파이프라인(Outbox + SSE 브로커)을 연결해 `use-job-stream`이 실시간 진행을 소비할 수 있게 한다.

## 4. UI API 연동 전환

- [x] 4.1 `apps/web/src/lib/api.ts`에 생성 요청/상태/이벤트 API 호출 함수를 실제 엔드포인트로 연결한다.
- [x] 4.2 `apps/web/src/widgets/video-creator/wizard.tsx`에서 데모 타이머/하드코딩 진행 흐름을 제거하고 실제 `jobId` 기반 진행 로직으로 교체한다.
- [x] 4.3 `apps/web/src/features/notification/use-job-stream.ts`에서 SSE 우선, 폴링 폴백을 구현하고 실패/중단 시 사용자 피드백을 노출한다.
- [x] 4.4 클라이언트에서 완료/실패/재시도 상태 표기를 스펙 계약과 동일하게 정규화한다.

## 5. 검증 및 정합성 점검

- [x] 5.1 `apps/api/src/main.health.test.ts`에서 `/health`가 종속성 저하 상태에서도 HTTP 200과 readiness payload를 반환하는지 자동 검증한다.
- [x] 5.2 `apps/api/src/api/media/job-routes.test.ts`, `apps/api/src/infrastructure/queue/workers/media-generate.worker.test.ts`, `apps/api/src/application/media/pipeline-integration.test.ts`로 생성 요청 직후 `jobId` 발급/queue enqueue와 워커 처리 후 상태·이벤트 정합성을 자동 검증한다.
- [x] 5.3 `apps/api/src/api/media/job-routes.test.ts`, `apps/api/src/infrastructure/queue/workers/media-generate.worker.test.ts`, `apps/api/src/application/media/retry-generation.usecase.test.ts`로 enqueue 실패·재시도 가능 상태·복구 경로를 자동 검증한다.
