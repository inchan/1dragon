# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Environment

- **Monorepo**: Turbo + pnpm workspace
- **Package Manager**: pnpm 9.15.0+, Node.js ≥20.0.0
- **Frontend**: React 19, TypeScript, Vite 6, TanStack Router/Query
- **Backend**: Hono, tsyringe DI, Drizzle ORM, PostgreSQL
- **Shared Types**: Zod schemas (`packages/shared`)
- **UI Framework**: Tailwind CSS, shadcn/ui, Radix UI
- **Auth**: Better Auth
- **Queue**: BullMQ + Redis
- **Testing**: Vitest (unit), Playwright (E2E)
- **Code Quality**: Biome (formatter/linter), ESLint (boundaries only), TypeScript strict mode
- **Monitoring**: Sentry
- **Architecture**: Frontend FSD (Feature-Sliced Design), Backend DDD (Hexagonal)
- **Workflow**: OpenSpec spec-driven development

### Monorepo Structure

```
apps/
├── web/          # React 19 + Vite (Frontend SPA)
└── api/          # Hono (Backend API)
packages/
├── shared/       # Zod schemas, shared types
├── ui/           # shadcn/ui + Tailwind components
└── config/       # Shared configuration
tooling/
├── typescript/   # Base/React/Node tsconfig presets
├── biome/        # Biome formatter/linter config
└── eslint/       # ESLint boundaries config
```

## Core Rules

### TDD (NON-NEGOTIABLE)

**Every line of business logic must be written in response to a failing test.**

1. **Red**: Write failing test FIRST
2. **Green**: Write MINIMUM code to pass
3. **Refactor**: Improve after every green

**Test Coverage Policy**:

- **DO** write unit tests: Business logic in `model/`, `lib/`, `api/` (hooks, utilities, API calls)
- **DO NOT** write unit tests: UI components in `ui/` (presentational components)
- Integration tests cover UI integration

**Code Quality**:

- No `any` types, no `@ts-ignore`, no type assertions
- 100% test coverage on business behavior
- Immutable data, pure functions

### Biome Rules (CRITICAL)

Biome is the primary formatter AND linter. Build will fail on violations.

**Formatter**:

- Tab indentation (width: 2)
- Line width: 100
- Single quotes for strings
- Semicolons: as needed (omit where possible)
- Import organization: automatic

**Linter**:

- All recommended rules enabled
- `noExcessiveCognitiveComplexity`: warn
- Naming conventions enforced:
  - PascalCase: types, interfaces, enums
  - CONSTANT_CASE: enum members

### TypeScript Rules

- Strict mode with `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`
- Explicit return types on ALL exported functions
- No parameter reassignment: `return { ...obj, name: 'new' }`

### React Rules

- No nested components (define at module level, use factory + useMemo)
- No props spreading: `<C prop1={x} prop2={y} />` not `<C {...props} />`
- No `.bind()` in JSX (arrow functions OK)
- Destructure props: `function C({ name }: Props): JSX.Element`
- Hooks: call at top level only (not in loops/conditions)
- Component names must be uppercase

### FSD Layers (Frontend — enforced by eslint-plugin-boundaries)

```
app → widgets → features → shared (one-way only)
```

**Note**: `entities` is merged into `features` for simplicity. Features contain:

- `api/`: queries (GET) and mutations (POST/PATCH/DELETE)
- `model/`: types, business logic
- `ui/`: UI components
- `lib/`: utilities

### Backend Architecture (DDD + Hexagonal)

```
src/
  domain/         # Pure business logic (no framework imports)
    {context}/
      entities/   # Domain entities
      ports/      # Interfaces (inbound/outbound)
      services/   # Domain services
  application/    # Use cases, orchestration
  infrastructure/ # Adapters (DB, external APIs, queues)
  api/            # HTTP layer (Hono routes)
```

**Dependency rule**: `api → application → domain ← infrastructure`

- Domain layer has ZERO external dependencies
- DI via tsyringe: inject ports, implement as adapters
- Drizzle ORM for type-safe database access

### i18n (Internationalization)

- When adding text strings, MUST translate to all 3 languages: `en`, `ko`, `ja`
- Key naming: snake_case with feature namespace

### UX Optimization

- **Optimistic Updates**: TanStack Query `onMutate`, React 19 `useOptimistic`
- **Debouncing**: Search inputs, auto-save
- **useTransition**: Non-urgent updates
- **useDeferredValue**: Expensive re-renders

## Common Commands

```bash
# Development
pnpm dev                # Start all dev servers
pnpm build              # Build all packages/apps

# Testing
pnpm test               # Run unit tests (Vitest)
pnpm test -- --watch    # Watch mode

# Quality
pnpm typecheck          # TypeScript check (all packages)
pnpm lint               # Lint all (Biome + ESLint)
pnpm format             # Format all (Biome)
pnpm format:check       # Check formatting (Biome)

# Maintenance
pnpm clean              # Clean build artifacts
```

## Known Issues

- **tsup DTS build**: `incremental: true` in `tooling/typescript/base.json` conflicts with tsup `--dts`. When adding new packages using tsup, either override `incremental` in the package's tsconfig or use a separate build tsconfig.
