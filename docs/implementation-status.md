# Implementation Status

## Layering Plan

The backend will be implemented in these layers:

1. Foundation and shared domain vocabulary
2. Persistence and domain modules for languages, tags, and tours
3. Admin authentication and authorization
4. Blog management and public read APIs
5. Newsletter subscriber lifecycle
6. Storage and provider integrations

## Current Layer

### Layer 2: Persistence and domain modules for languages, tags, and tours

Completed in this step:

- Added PostgreSQL-oriented TypeORM configuration, a root `typeorm.config.ts`, and migration scripts in `package.json`.
- Added the initial database migration for `languages`, `tags`, `tours`, `tour_itinerary_stops`, `tour_translations`, and `tour_tags`.
- Implemented admin-internal Nest modules for languages, tags, and tours.
- Added entity models for `Language`, `Tag`, `Tour`, `TourTranslation`, and shared itinerary stops.
- Added validation around the v1 JSON Schema subset, relaxed draft validation, tag membership, stop-based itinerary integrity, and translation publication readiness.
- Added admin-internal CRUD-style endpoints for listing and updating languages, managing the tag dictionary, and creating/updating tours.

This layer intentionally does **not** include:

- Auth0 integration
- Role enforcement on admin routes
- Public read APIs
- Blog modules
- Newsletter subscriber workflows
- Storage or email provider integrations

## Next Layer

### Layer 3: Admin authentication and authorization

The next step should implement secure admin access on top of the current modules:

- Add Auth0-backed admin authentication and local admin user mapping.
- Introduce `AdminUser`, `Role`, and permission enforcement across the admin controllers.
- Attribute write operations to the acting admin user instead of accepting audit fields from request bodies.
- Add route protection and deny operations that exceed the caller's role.
- Keep public APIs, blog delivery, and newsletter flows for later layers.

## Working Notes

- `docs/` contains requirement and schema files that remain the source material for the implementation.
- The current tour layer is admin-internal only and is not yet protected by authentication or authorization.
- Tour translation validation supports incomplete draft payloads by relaxing `required` fields until a locale becomes `ready` or `published`.
