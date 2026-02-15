## Context
현재 API 클라이언트에서 `response.json()` 실패 시 처리가 일관적이지 않아, 네트워크/타임아웃/형식 오류가 같은 형태로 보이지 않습니다.

## Goals / Non-Goals
**Goals:**
- 외부 응답이 비JSON이거나 빈 문자열일 때 예측 가능한 에러로 처리한다.
- Toss 결제 응답의 파싱 실패를 결제 전용 오류 타입으로 일관성 있게 매핑한다.
- 기존 성공 응답 스키마 매핑은 유지한다.

**Non-Goals:**
- 웹훅/채널 별 비즈니스 규칙 변경
- 신규 리트라이 정책 도입

## Decisions
### Decision 1: 최소 침투형 공통 파서 도입
`apps/web/src/lib/api.ts`에서는 `fetchApi`, `uploadApi`, `shareToSocial`가 공유할 수 있는 작은 JSON 파서 유틸을 추가해 중복과 예외 불일치를 줄인다.

### Decision 2: 파싱 실패 시 명시적 분기
`apps/api/src/infrastructure/providers/payment/toss-payments.client.ts`에서는 원시 텍스트 파싱을 통해 비정상 JSON을 실패 코드로 변환한다.
