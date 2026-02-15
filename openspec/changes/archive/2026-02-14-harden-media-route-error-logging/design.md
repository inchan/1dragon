## Context
현재 `apps/api/src/api/media/routes.ts`는 동작 안정성을 위해 예외를 흡수하는 방식으로 구현되어 있습니다. 다만 운영 가시성을 위해 에러 근본 원인(입력 파싱/재시도 실패/스트림 종료 레이스)을 로그로 남길 필요가 있습니다.

## Goals / Non-Goals

**Goals:**
- 기존 API 응답 형식과 상태 코드를 변경하지 않고 에러 로그를 추가합니다.
- 요청/플랫폼/시도 횟수 등 추적용 메타데이터를 함께 기록합니다.

**Non-Goals:**
- 업로드 실패 로직 자체 변경(재시도 횟수, 플랫폼 정책, 파싱 규칙)
- 클라이언트 API 계약(응답 스키마) 변경

## Decisions

### Decision 1: Keep behavior-compatible error handling and enrich observability in-place

코드 수정은 동일 파일 내부에서 최소 범위로 수행해 동작은 유지하고, `catch`에서 조용히 무시되던 실패를 로그로 전환합니다. 이는 운영 추적성 향상에 집중하면서 회귀 위험을 낮춥니다.
