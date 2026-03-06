## Context
`media`와 `payments` 라우터는 스키마 검증 실패 시 동일한 `VALIDATION_ERROR` 문자열 코드와 텍스트 메시지만 반환합니다. 에러 필드 상세가 없어 프론트/클라이언트가 정확한 피드백을 구성하기 어렵습니다.

## Goals / Non-Goals

**Goals:**
- `media`와 `payments` 라우터의 `safeParse` 실패 응답을 표준화한다.
- 필드 레벨 상세 정보를 함께 반환한다.

**Non-Goals:**
- 유효성 규칙 자체 변경
- 인증/권한 로직 변경

## Decisions

### Decision 1: Error code and details standardization
`@1dragon/shared`의 `ErrorCode.VALIDATION`을 모든 대상 라우트에서 사용하고, `details.fieldErrors`를 공통 형태로 구성한다.

### Decision 2: Minimal helper inside each router
추가 의존성 확장을 피하기 위해 각 라우터에서 단일 헬퍼 함수를 두어 필드 오류 배열로 변환해 응답한다.
