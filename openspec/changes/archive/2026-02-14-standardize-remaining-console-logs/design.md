## Context
여러 계층(라우트/유즈케이스/인프라)에서 일부 콘솔 호출이 남아 있어 로그 품질 규칙이 분산되어 있습니다.

## Goals / Non-Goals

**Goals:**
- 잔여 콘솔 로그 3건을 `logger`로 교체해 일관된 구조화 출력 확보
- 기존 경고/오류 동작 유지

**Non-Goals:**
- 이벤트 추가/알림/리트라이 정책 변경
- 에러 처리 로직 변경

## Decisions

### Decision 1: Use logger per layer via local import
각 파일에서 `logger`를 직접 import해 최소 변경으로 교체한다.

### Decision 2: Preserve semantic messages and add fields
기존 메시지 의도를 유지하고, 구조화 필드로 사용자/문맥 데이터를 남긴다.
