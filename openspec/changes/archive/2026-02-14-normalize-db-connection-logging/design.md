## Context
`db.ts`는 연결 초기화, 풀 에러 처리, 연결 테스트에서 직접 콘솔 출력을 사용하고 있습니다. 프로젝트의 로깅 체계는 `pino` 기반 구조화 로거(`apps/api/src/infrastructure/logging/index.ts`)를 사용하므로, 동일 파일 내 로그만 기존 로거 규약에 맞춰 정리합니다.

## Goals / Non-Goals

**Goals:**
- 데이터베이스 연결 로직의 콘솔 로그를 구조화 로거로 교체
- 연결 성공/실패/풀 에러에서 일관된 레벨(info/error)로 기록
- 기존 함수 시그니처와 반환 값(`boolean`, `void`) 동작 유지

**Non-Goals:**
- DB 재연결 정책, 재시도 로직, 쿼리 로직 변경
- 기존 에러 처리 로직의 의미 변경

## Decisions

### Decision 1: Replace direct console output with shared logger
`console.log`/`console.error`를 삭제하고 `logger.info`/`logger.error`로 대체해 구조화 로그와 중앙 집계 체계를 준수합니다.

### Decision 2: Keep behavior unchanged
성공/실패 반환값 로직은 유지하여 배포 리스크를 낮춥니다. 출력되는 메시지 문구는 기존 메시지를 중심으로 보존해 운영자 가독성을 유지합니다.
