# version-config Specification

## Purpose
TBD - created by archiving change centralize-version-config. Update Purpose after archive.
## Requirements
### Requirement: Version metadata SHALL be sourced from shared config
The application health response MUST use `config.APP_VERSION` for version output.

#### Scenario: Health endpoint returns metadata

- **WHEN** `/health` is called
- **THEN** the response MUST set `version` to `config.APP_VERSION`.
- **AND** no inline `process.env.npm_package_version` fallback SHOULD remain in health handler.

