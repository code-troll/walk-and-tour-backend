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

### Layer 5: Newsletter subscriber lifecycle

Completed in this step:

- Added `NewsletterSubscriber` persistence plus a new migration for subscriber lifecycle data.
- Implemented public subscribe, confirm, and unsubscribe endpoints with double opt-in state transitions and tokenized confirmation/unsubscribe handling.
- Added protected admin subscriber list, detail, search, pagination, and CSV export operations for `super_admin` and `marketing`.
- Preserved consent, confirmation, and unsubscribe audit timestamps in PostgreSQL together with optional preferred locale and source metadata.
- Added Swagger documentation and unit coverage for newsletter DTOs, endpoints, and service flows.

This layer intentionally does **not** include:

- Email provider integration or actual email dispatch
- Campaign authoring or sending workflows
- Storage abstractions for media or provider-backed outbound delivery
- Booking or customer-account features

## Next Layer

### Layer 6: Storage and provider integrations

The next step should implement the remaining infrastructure-focused slice:

- Add application-level storage abstractions for local development and Supabase-backed production media storage.
- Add email-provider integration so newsletter confirmation and unsubscribe links can be dispatched through a provider such as Resend.
- Keep domain and persistence contracts stable while introducing provider-backed delivery implementations.
- Extend test coverage to provider abstractions and integration-style behavior once those adapters exist.

## Working Notes

- `docs/` contains requirement and schema files that remain the source material for the implementation.
- The current admin routes expect an Auth0 access token whose `sub` and `email` can be mapped to a local `AdminUser`.
- If the local admin table is empty, `AUTH_BOOTSTRAP_SUPER_ADMIN_EMAIL` optionally creates the first bootstrap admin mapping on startup.
- Tour translation validation supports incomplete draft payloads by relaxing `required` fields until a locale becomes `ready` or `published`.
- Public content routes require an explicit `locale` query parameter and intentionally do not fall back to another locale when content is unavailable.
- Before starting layer 5, the tour test suite now covers create/update flows, stop-based itinerary replacement, translation description updates, and admin/public response-shape assertions.
- Swagger/OpenAPI documentation is exposed at `/api/docs` and `/api/docs-json`, with exhaustive request/response schema descriptions for the current API surface.
- Newsletter subscriber email delivery itself is still deferred to the provider-integration layer; layer 5 persists and validates the token/state workflow but does not dispatch outbound mail yet.
