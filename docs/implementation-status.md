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

### Layer 6: Storage and provider integrations

Completed in this step:

- Added application-level email-provider abstractions with `console` and Resend-backed implementations.
- Wired newsletter subscribe flows to dispatch provider-backed confirmation emails containing direct confirmation and unsubscribe links.
- Added application-level storage abstractions with local-filesystem and Supabase-backed implementations behind one shared contract.
- Added direct-link GET confirmation and unsubscribe endpoints to support email-driven tokenized flows without changing subscriber persistence.
- Added configuration, Swagger updates, and unit coverage for provider and storage adapters.

This layer intentionally does **not** include:

- Campaign authoring or sending workflows
- Media upload endpoints or file-management APIs
- Booking or customer-account features

## Next Layer

### No Further Layer In Current Plan

The six planned backend layers are now implemented. The next step, if requested, should be a post-plan slice such as:

- provider integration hardening with real environment verification
- media upload and retrieval APIs on top of the storage abstraction
- higher-level integration tests against a real database and configured providers
- new product capabilities beyond the current MVP scope

## Working Notes

- `docs/` contains requirement and schema files that remain the source material for the implementation.
- The current admin routes expect an Auth0 access token whose `sub` and `email` can be mapped to a local `AdminUser`.
- If the local admin table is empty, `AUTH_BOOTSTRAP_SUPER_ADMIN_EMAIL` optionally creates the first bootstrap admin mapping on startup.
- Tour translation validation supports incomplete draft payloads by relaxing `required` fields until a locale becomes `ready` or `published`.
- Public content routes require an explicit `locale` query parameter and intentionally do not fall back to another locale when content is unavailable.
- Before starting layer 5, the tour test suite now covers create/update flows, stop-based itinerary replacement, translation description updates, and admin/public response-shape assertions.
- Swagger/OpenAPI documentation is exposed at `/api/docs` and `/api/docs-json`, with exhaustive request/response schema descriptions for the current API surface.
- Newsletter confirmation emails are now dispatched through the configured email provider abstraction; `console` is the safe default and Resend is available through environment configuration.
- Storage provider selection is environment-driven: local filesystem for development defaults and Supabase-backed object storage for production-style configuration.
- Local development now has a reset-and-reseed command that recreates a predictable demo dataset for admin, content, and newsletter testing without adding a new product layer.
- Tour translations now surface and validate localized `highlights`, `included`, and `notIncluded` lists in admin/public responses and seeded demo content.
- Tour and tour-translation visibility now relies on `publicationStatus` only; the former `isHidden` flags were removed from the model and schema.
