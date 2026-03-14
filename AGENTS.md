# AGENTS.md

This file defines the expected operating behavior for agents working in this repository.

## Core Rule

For every feature addition, feature modification, or feature removal:

- update the affected tests
- update the Swagger/OpenAPI documentation
- validate both before finishing the task

A change is not complete if the runtime behavior changed but the tests or Swagger contract were left stale.

## Required Validation

Unless the user explicitly asks not to, run the relevant verification after code changes:

- `npm test`
- `npm run build`

When API contracts, DTOs, controllers, or response shapes change, also verify that Swagger annotations still compile and remain aligned with runtime behavior.

If a command cannot be run because of sandbox, environment, external dependency, or missing infrastructure, state that explicitly in the final response.

## API Contract Discipline

When touching any endpoint, DTO, controller, or returned payload:

- update request schemas
- update response schemas
- update enum descriptions and field descriptions
- keep path params, query params, auth requirements, and error responses documented
- avoid generic `object` schemas when a concrete schema can be described

Swagger must reflect the actual current implementation, not an aspirational design.

## OpenAPI Export Discipline

When a change affects the API contract or its documentation, regenerate the checked-in OpenAPI YAML:

- run `npm run openapi:export`
- update `docs/backend.yaml`
- do not leave `docs/backend.yaml` stale relative to Swagger annotations and DTO validation metadata

API-affecting work is not complete unless `docs/backend.yaml` has been refreshed to match the current implementation.

## Test Discipline

When behavior changes:

- add or update unit tests for the changed service/controller logic
- cover happy paths, validation failures, and important edge cases
- prefer extending existing test helpers and fixtures instead of duplicating ad hoc mocks

When fixing a bug, add a test that would have failed before the fix.

## Documentation Discipline

After meaningful backend changes, update the relevant project docs:

- `docs/implementation-status.md`
- `docs/testing.md` when coverage scope changes
- `docs/api-documentation.md` when the documented API surface changes
- `README.md` when developer-facing commands or entry points change

Leave clear notes on:

- what was implemented
- what changed
- what remains next

## Layered Delivery

This project is being implemented by layers. Respect that sequencing.

- do one layer or requested slice at a time
- stop after completing the requested scope
- do not silently start the next layer
- document what was done and what the next step is

## Persistence and Migrations

When changing persistence behavior:

- keep entities, migrations, and runtime code aligned
- create or update migrations for schema changes
- do not leave entity changes without a matching migration strategy
- preserve existing data behavior where possible and call out risks when not possible

## Backward Compatibility and Safety

Prefer additive, explicit changes unless the user asked for breaking changes.

- avoid silent contract breaks
- if a response shape changes, update Swagger and tests in the same task
- if a destructive or risky change is required, call it out clearly

Do not revert unrelated user changes.

## Code Quality

- keep changes scoped to the task
- prefer clear names over clever abstractions
- avoid dead code and placeholder code
- keep validation close to input boundaries
- preserve existing architectural patterns unless there is a strong reason to change them
- add comments only when they materially improve readability

## Final Response Expectations

When finishing a task, report:

- what changed
- which tests/verification were run
- whether Swagger was updated
- any limitations or unverified parts
- the next logical step when relevant
