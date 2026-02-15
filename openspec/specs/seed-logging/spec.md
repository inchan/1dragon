# seed-logging Specification

## Purpose
TBD - created by archiving change seed-logging-standardization. Update Purpose after archive.
## Requirements
### Requirement: The seed scripts SHALL use structured logger
The seed process SHALL emit logs only through structured logger.

#### Scenario: Seed updates existing records

- **WHEN** existing data is found in seed execution
- **THEN** `logger.info` MUST be called with log fields including `action`, `entity`, and identifier fields such as `seed_name`, `tier`, or `platform`.

#### Scenario: Seed inserts new records

- **WHEN** a new seed record is inserted
- **THEN** `logger.info` MUST be called with log fields including `action`, `entity`, and identifier fields such as `seed_name`, `tier`, or `platform`.

#### Scenario: Seed batch completes

- **WHEN** seed processing completes
- **THEN** completion should be logged with `logger.info`
- **AND** `total_records` MUST be included in log fields.

