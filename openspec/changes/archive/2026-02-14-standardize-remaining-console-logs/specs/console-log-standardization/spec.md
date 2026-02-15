## ADDED Requirements

### Requirement: Remaining Console Logs SHALL be Migrated to Structured Logger
The application SHALL emit only structured logs from remaining console log call sites.

#### Scenario: Image quality warning path

- **WHEN** `analyze-image` 유즈케이스에서 배경 제거가 실패하고 fallback이 실행되면
- **THEN** 경고 로그를 `logger.warn`으로 기록하고, `imageUrl`이 필드에 **MUST** 포함되어야 한다.

#### Scenario: Product route low-resolution detection

- **WHEN** 업로드 이미지가 최소 해상도 미달인 경우를 감지하면
- **THEN** `logger.info`로 저해상도 이벤트를 기록해야 하며
- **AND** `userId`, `width`, `height`가 필드로 **MUST** 포함되어야 한다.

#### Scenario: Auth hook plan assignment failure

- **WHEN** 사용자 생성 후 Free 플랜 생성 실패가 발생하면
- **THEN** `logger.error`로 에러와 사용자 ID를 함께 기록해야 하며, 에러 객체가 로그 컨텍스트에 **MUST** 포함되어야 한다.
