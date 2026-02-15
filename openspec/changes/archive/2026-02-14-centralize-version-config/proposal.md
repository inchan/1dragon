## Why
`/health` 응답에서 앱 버전을 계산할 때 `process.env` 직접 참조와 하드코딩 기본값을 혼용해 관리 지점이 분산되어 있습니다. 애플리케이션 구성값은 하나의 설정 소스로 집중되는 편이 운영/배포 일관성에 유리합니다.

## What Changes
- `apps/api/src/shared/config.ts`에 `APP_VERSION` 스키마를 추가해 기본값을 중앙 설정으로 관리해야 한다.
- `apps/api/src/main.ts`에서 `process.env.npm_package_version ?? '0.0.0'` 패턴을 제거하고 `config.APP_VERSION`만 사용한다.
- 기존 `/health` 응답 동작 자체는 유지하고 값 출처만 중앙화한다.

## Capabilities
### New Capabilities
- `version-config`: 앱 버전 설정값의 중앙 관리

### Modified Capabilities
- 없음

## Impact
- `apps/api/src/shared/config.ts`
- `apps/api/src/main.ts`
