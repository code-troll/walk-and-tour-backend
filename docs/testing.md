# Testing

## Current Test Foundation

The repository now uses Jest with `ts-jest` for unit-style coverage across the current service and controller layer.

### Commands

- `npm run lint`
- `npm run lint:fix`
- `npm test`
- `npm run test:cov`
- `npm run build`

## What Is Covered

The current suite focuses on branch-heavy and contract-heavy logic:

- admin authentication resolution and JWT guard behavior
- language and tag service behavior
- tour schema policy and payload validation
- tour public visibility and controller delegation
- tour service creation and update flows, including stop-based itinerary replacement, translation upserts, and required localized list validation for `highlights`, `included`, and `notIncluded`
- admin and public tour response shapes for descriptive and stop-based itineraries
- blog post admin service behavior
- blog public visibility and controller delegation
- newsletter subscriber double opt-in, unsubscribe, admin search, and CSV export flows
- provider-backed newsletter email delivery and storage adapter behavior
- local development seed reset-and-reseed orchestration

Shared test utilities live under `test/` so future layers can reuse repository mocks and module-level stubs instead of rebuilding test scaffolding.

## Linting

The repository now uses ESLint with a flat config in `eslint.config.mjs` for TypeScript/NestJS code. The current setup is intentionally strict on unused variables while avoiding high-noise style churn rules that would require large mechanical rewrites across the codebase.

## Next Coverage Step

The next useful expansion should target:

- `AdminUsersService`, `AdminRolesGuard`, and admin-auth controller behavior
- integration-style coverage for provider-backed flows against a real Postgres test database or higher-level application modules
