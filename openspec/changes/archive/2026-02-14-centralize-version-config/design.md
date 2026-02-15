## Context
현재 버전 값이 라우트 핸들러에서 직접 환경 변수와 하드코딩 값을 조합하고 있어 설정 일관성이 떨어집니다. 설정 스키마는 이미 여러 런타임 값의 단일 진입점을 제공하고 있습니다.

## Goals / Non-Goals

**Goals:**
- APP_VERSION 값을 config 스키마에 등록하고 main.ts에서 중앙값을 읽는다.

**Non-Goals:**
- 버전 산정 방식(예: git tag 기반) 변경
- `/health` 응답 포맷 변경

## Decisions

### Decision 1: Add APP_VERSION with default
`config` schema에 `APP_VERSION`을 추가하고 기본값은 기존 동작(`0.0.0`)과 동일하게 둔다.

### Decision 2: Replace inline env access in route
`main.ts`는 버전 필드에 `config.APP_VERSION`만 사용한다.
