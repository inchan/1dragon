## ADDED Requirements

### Requirement: Monorepo structure with Turbo and pnpm
The system SHALL use a Turbo + pnpm workspace monorepo with the following packages: `apps/web` (React 19 frontend), `apps/api` (Hono backend), `packages/shared` (shared types/Zod schemas), `packages/ui` (shared UI components), `packages/config` (shared lint/build config). Node.js ≥20.0.0 and pnpm ≥9.15.0 MUST be enforced via `engines` field.

#### Scenario: Fresh clone and install
- **WHEN** a developer clones the repository and runs `pnpm install`
- **THEN** all workspace packages are installed, symlinked, and `pnpm build` succeeds for all packages without errors

#### Scenario: Turbo task orchestration
- **WHEN** `pnpm turbo run build` is executed
- **THEN** packages are built in dependency order (shared → ui → config → web/api) with Turbo caching enabled

#### Scenario: Node version enforcement
- **WHEN** a developer with Node.js < 20.0.0 runs `pnpm install`
- **THEN** the install fails with a clear error message indicating the minimum Node.js version requirement

---

### Requirement: TypeScript strict mode across all packages
All packages MUST use TypeScript with `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`. A base `tsconfig.json` in `tooling/typescript/` MUST be extended by all packages.

#### Scenario: Strict type checking on build
- **WHEN** code contains an implicit `any` type or unchecked index access
- **THEN** `tsc --noEmit` fails with a type error

#### Scenario: Shared tsconfig inheritance
- **WHEN** a new package is added to the monorepo
- **THEN** it extends `@snapvid/typescript-config/base.json` and inherits all strict settings

---

### Requirement: Biome for formatting and linting
The system SHALL use Biome as the primary formatter and linter. A shared Biome configuration MUST be placed in `tooling/biome/`. All packages MUST extend this configuration. Single quotes for strings, PascalCase for types, UPPER_CASE for enum members MUST be enforced.

#### Scenario: Format check on CI
- **WHEN** CI pipeline runs `pnpm biome check .`
- **THEN** unformatted files cause the pipeline to fail with a list of violations

#### Scenario: Auto-format on save
- **WHEN** a developer saves a file in their IDE with Biome extension enabled
- **THEN** the file is automatically formatted according to the shared Biome configuration

---

### Requirement: ESLint with FSD boundary enforcement
The system SHALL use eslint-plugin-boundaries to enforce FSD layer dependencies: `app → widgets → features → shared` (one-way only). Cross-feature imports (e.g., `features/media` importing from `features/payment`) MUST be blocked. Import order: external → internal (@/) → relative.

#### Scenario: Cross-feature import violation
- **WHEN** code in `features/media/` imports from `features/payment/`
- **THEN** ESLint reports a boundary violation error

#### Scenario: Reverse layer import violation
- **WHEN** code in `shared/` imports from `features/`
- **THEN** ESLint reports a boundary violation error

#### Scenario: Valid import chain
- **WHEN** code in `widgets/video-creator/` imports from `features/media/` and `features/payment/`
- **THEN** ESLint passes with no boundary violations

---

### Requirement: Vitest for unit testing
The system SHALL use Vitest as the unit testing framework for both frontend and backend. Test files MUST be co-located with source files using the `.test.ts` / `.test.tsx` suffix. Coverage MUST be measured on `model/`, `lib/`, `api/` directories (NOT `ui/` components).

#### Scenario: Run unit tests
- **WHEN** `pnpm turbo run test` is executed
- **THEN** Vitest runs all `.test.ts` / `.test.tsx` files across all packages and reports results

#### Scenario: Coverage threshold
- **WHEN** business logic files in `model/`, `lib/`, `api/` have less than 100% branch coverage
- **THEN** the test command exits with a non-zero code indicating coverage failure

---

### Requirement: Playwright for E2E testing
The system SHALL use Playwright for end-to-end testing. E2E tests MUST reside in `apps/web/e2e/` directory. Tests MUST run against the built application (not dev server).

#### Scenario: E2E test execution
- **WHEN** `pnpm playwright test` is executed
- **THEN** Playwright launches a browser, runs all E2E test files, and reports results

---

### Requirement: CI/CD pipeline
The system SHALL have a GitHub Actions CI pipeline that runs on every push and PR. The pipeline MUST execute: type check → lint → format check → unit tests → build → E2E tests (on PR only). All steps MUST pass before merging.

#### Scenario: PR pipeline success
- **WHEN** a pull request is opened with passing code
- **THEN** all CI steps pass and the PR is marked as ready to merge

#### Scenario: PR pipeline failure on type error
- **WHEN** a pull request introduces a TypeScript type error
- **THEN** the type check step fails and the PR is blocked from merging

---

### Requirement: i18n foundation with three languages
The system SHALL support internationalization with three languages: `en`, `ko`, `ja`. Translation files MUST be located at `apps/web/src/locales/{lang}/*.json`. Key naming MUST use snake_case with feature namespace (e.g., `media.upload_title`). All user-facing text MUST use i18n keys, not hardcoded strings.

#### Scenario: Add new user-facing text
- **WHEN** a developer adds a new UI string
- **THEN** translation keys are added to all three language files (`en`, `ko`, `ja`)

#### Scenario: Missing translation detection
- **WHEN** a translation key exists in `ko` but is missing in `en` or `ja`
- **THEN** the build or lint step reports a missing translation error

---

### Requirement: Sentry error monitoring
The system SHALL integrate Sentry for error monitoring in both frontend (`apps/web`) and backend (`apps/api`). Source maps MUST be uploaded during build. Environment (development/staging/production) MUST be tagged on all events.

#### Scenario: Unhandled error in production
- **WHEN** an unhandled exception occurs in the frontend or backend
- **THEN** the error is captured and reported to Sentry with stack trace, environment tag, and user context

---

### Requirement: Shared Zod schemas in packages/shared
API request/response schemas MUST be defined as Zod schemas in `packages/shared`. Both frontend (TanStack Query) and backend (Hono validation) MUST import and use these shared schemas. TypeScript types MUST be inferred from Zod schemas (not manually duplicated).

#### Scenario: API contract change
- **WHEN** a Zod schema in `packages/shared` is modified
- **THEN** both frontend and backend code that uses the inferred type is type-checked against the new schema at build time

#### Scenario: Request validation
- **WHEN** the backend receives a request that does not match the Zod schema
- **THEN** Hono middleware returns HTTP 400 with structured validation error details
