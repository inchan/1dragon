## 1. Configuration source

- [x] 1.1 `apps/api/src/shared/config.ts`에 `APP_VERSION` 기본값 정의 추가

## 2. Main handler update

- [x] 2.1 `apps/api/src/main.ts`의 `/health` 응답에서 inline `process.env.npm_package_version` 제거
- [x] 2.2 `config.APP_VERSION`로 교체
