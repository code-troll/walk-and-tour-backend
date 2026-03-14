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
- tag label maximum-length validation
- tag deletion with cascade-removal of tour/blog join-table associations
- tour schema policy and payload validation
- tour public visibility and controller delegation
- tour service creation and shared-tour update flows, including stop-based itinerary replacement, split translation create/update/publish flows, automatic translation readiness recalculation, and required localized list validation for `highlights`, `included`, and `notIncluded`
- translation deletion behavior and controller delegation for nested tour-translation routes
- localized tour cancellation policy validation and response mapping
- tour media asset validation, including localized alt-text maps
- admin media upload controller/service behavior and storage delegation
- shared non-localized `name` handling for tours and blog posts in admin create/update flows
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
