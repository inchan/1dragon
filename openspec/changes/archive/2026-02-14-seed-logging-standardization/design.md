## Context
시드 스크립트는 스키마 초기 데이터 동기화의 마지막 안전장치 역할을 합니다. 현재는 `console.log` 기반 로그만 존재해 운영 집계의 형식 일관성이 떨어집니다.

## Goals / Non-Goals

**Goals:**
- 모든 시드 스크립트 로그를 중앙 `logger`로 통일한다.
- 기존 성공/실패 제어 흐름은 그대로 유지한다.

**Non-Goals:**
- 시드 대상 데이터셋 자체의 변경
- 트랜잭션/성능 전략 변경

## Decisions

### Decision 1: Use shared logger from infrastructure logging
각 시드 파일 상단에 `logger`를 추가해 상태 로그를 구조화로 변경한다.

### Decision 2: Preserve message semantics
기존 문자열 템플릿은 유지하되 구조화 필드(예: `seed`, `action`, `entity`)를 추가해 모니터링 분석성을 높인다.
