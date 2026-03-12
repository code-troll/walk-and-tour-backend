# Testing

## Current Test Foundation

The repository now uses Jest with `ts-jest` for unit-style coverage across the current service and controller layer.

### Commands

- `npm test`
- `npm run test:cov`
- `npm run build`

## What Is Covered

The current suite focuses on branch-heavy and contract-heavy logic:

- admin authentication resolution and JWT guard behavior
- language and tag service behavior
- tour schema policy and payload validation
- tour public visibility and controller delegation
- tour service creation and update flows, including stop-based itinerary replacement and translation upserts
- admin and public tour response shapes for descriptive and stop-based itineraries
- blog post admin service behavior
- blog public visibility and controller delegation
- newsletter subscriber double opt-in, unsubscribe, admin search, and CSV export flows

Shared test utilities live under `test/` so future layers can reuse repository mocks and module-level stubs instead of rebuilding test scaffolding.

## Next Coverage Step

The next useful expansion should target:

- `AdminUsersService`, `AdminRolesGuard`, and admin-auth controller behavior
- integration-style coverage once provider abstractions arrive in layer 6
