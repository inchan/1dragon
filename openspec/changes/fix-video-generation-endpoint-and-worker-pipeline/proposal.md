## Why

현재 1Dragon는 핵심 기능(영상 생성)의 사용성 검증이 되지 않을 정도로 실행 경로가 끊어진 상태입니다. 특히 API 진입점과 워커 파이프라인이 서로 연결되지 않아 실제 생성 요청을 처리하지 못하고, 배포 환경에서도 헬스체크로 서비스 상태를 빠르게 판정하기 어렵습니다.

최근 분석 결과, 사용자 요청(분석→생성→상태 조회→공유)에서 실제 처리 플로우의 대부분이 비활성 상태로 확인되어 즉시 운영 가능성을 확보하기 위해 실행 스택을 바로잡을 필요가 있습니다.

## What Changes

- **API 서버 실행 방식 고정**: 현재 Hono `fetch` export 방식에서 실제 HTTP 진입이 가능한 실행 방식으로 정합화하고, 최소 건강 상태 엔드포인트 확인 체계를 확보합니다.
- **영상 생성 요청 API 추가**: 스테이지/토큰/입력 검증 흐름을 명확히 한 생성 요청 엔드포인트를 추가하고, UI가 실제 API 호출 기반으로 진행/완료 상태를 전환하도록 전환합니다.
- **큐 enqueue + 워커 기동 체계 완성**: 생성 요청 시 BullMQ 큐에 잡을 적재하고, 실행 프로세스가 generate/compose/render-variant 워커를 기동해 이벤트 기반(및 폴백 폴링)으로 상태를 전달하도록 정합성을 맞춥니다.
- **엔드투엔드 상태 조회 정합성 강화**: 생성 요청 ID 기반으로 작업 상태와 이벤트를 조회할 수 있는 API 흐름을 일관되게 연결합니다.
- **기존 하드코딩 전환 제거**: UI의 데모/임시 진행 시뮬레이션 경로를 실제 작업 트래킹 경로로 치환해 사용자 관측 가능한 행동이 실제 처리와 일치하게 합니다.

## Capabilities

### New Capabilities
- `media-runtime-bootstrap`: API 런타임 부팅 방식과 헬스체크 기준을 운영 기준으로 통일해 실제 서버 수명주기를 보장한다.
- `media-generation-endpoint`: 인증된 사용자가 영상 생성 작업을 제출하고 진행 상태를 추적할 수 있는 API 계약을 제공한다.
- `media-worker-orchestration`: 생성 요청이 BullMQ 잡으로 enqueue되어 워커에서 처리되고 이벤트/상태를 갱신하는 파이프라인을 보장한다.

### Modified Capabilities
- `media-generation-endpoint`: 기존 분석 파이프라인(상품 분석) 연계 동선에서 실제 생성 엔드포인트 부재 상태를 요구사항으로 해소하기 위해 기능 동작 조건을 확장한다.

## Impact

- 영향 코드: `apps/api/src/main.ts`, `apps/api/src/api/media/routes.ts`, `apps/api/src/infrastructure/queue/*.ts`, `apps/api/src/infrastructure/queue/workers/*.ts`, `apps/web/src/widgets/video-creator/wizard.tsx`, `apps/web/src/lib/api.ts`, `apps/web/src/features/notification/use-job-stream.ts`
- 영향 API: `/health` 응답 보장, 영상 생성 API(신규/개선), 생성 작업 조회/이벤트 API 정합성
- 의존성: PostgreSQL, Redis, S3, 외부 I2V/미디어 인프라(기존 설정 하에서), 인증 미들웨어/세션 처리 흐름
- 운영 영향: 서비스 가동성 향상(실제 HTTP 서버 부팅 보장), 비동기 작업 처리 신뢰성 향상(실패/재시도/상태 전파), UI-백엔드 동기화로 사용자 오해 감소
