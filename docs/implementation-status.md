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
- Added application-level storage abstractions with local-filesystem and Railway S3-backed implementations behind one shared contract.
- Added an admin media asset API backed by the shared storage abstraction for reusable tour and future content media.
- Added direct-link GET confirmation and unsubscribe endpoints to support email-driven tokenized flows without changing subscriber persistence.
- Added configuration, Swagger updates, and unit coverage for provider and storage adapters.

This layer intentionally does **not** include:

- Campaign authoring or sending workflows
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
- Tag labels are validated as non-empty locale-keyed strings with a maximum length of 100 characters.
- Newsletter confirmation emails are now dispatched through the configured email provider abstraction; `console` is the safe default and Resend is available through environment configuration.
- Storage provider selection is environment-driven: local filesystem for development defaults and Railway Bucket-backed S3 storage for production-style configuration.
- Production deployments now include a dedicated migration that provisions the configured primary super-admin mapping in `admin_users`.
- Local development now has a reset-and-reseed command that recreates a predictable demo dataset for admin, content, and newsletter testing without adding a new product layer.
- Tour translations now surface and validate localized `highlights`, `included`, and `notIncluded` lists in admin/public responses and seeded demo content.
- Tour public visibility is now derived from shared tour completeness plus translation state; only `tour_translations.is_published` is stored, while `tour_translations.is_ready` is recalculated by the backend.
- Browser clients can now be allowlisted for cross-origin access through the `CORS_ALLOWED_ORIGINS` env setting during app bootstrap.
- If the local admin table is empty, bootstrap env vars can seed the first super admin on startup without an extra migration step.
- Tours and blog posts now persist a shared non-localized `name` field for admin-side identification in addition to slugs and localized translation titles.
- Tours and blog posts no longer persist or expose a `category` field; the latest migration removes it from both tables and API contracts.
- Tour `cancellationType` is now a localized free-text translation field, not a shared persisted tour column.
- Tour media is now stored through reusable `media_assets` records plus per-tour `tour_media` attachments, with localized alt text on each attachment and cover assignment managed through dedicated cover routes.
- Admin media now supports paginated library browsing through `GET /api/admin/media`, single-asset retrieval through `GET /api/admin/media/:id`, authenticated byte streaming through `GET /api/admin/media/:id/content`, image/video upload through `POST /api/admin/media`, and deletion through `DELETE /api/admin/media/:id`.
- Tours now manage media associations through dedicated nested endpoints instead of embedding media changes in `PATCH /api/admin/tours/:id`.
- Blog posts now attach and clear shared hero media through dedicated media endpoints and return resolved `heroMedia` objects instead of raw hero storage refs.
- Public media is exposed only through tour/blog-scoped routes, not a direct `/media/...` path.
- Admin tag deletion now performs an application-level cascade by removing tag associations from tours and blog posts before deleting the tag record.
- Tour writes are now split: shared tour data is saved through base-tour endpoints, translations are saved through nested translation endpoints, and translation publish/unpublish is only available through dedicated translation routes.
- Tour translations can now be permanently removed through a dedicated nested delete endpoint.
- Blog posts now follow the same publication model as tours: shared blog writes are separate from nested translation create/update/delete routes, only `blog_post_translations.is_published` is stored, and blog-level `publishedAt` is derived from translation publish actions.
- Tour catalog imports now have a canonical authoring contract in `docs/tour-migration-input.schema.json`, plus a data migration that reads `tour-migration-input.json` and upserts the prepared tour catalog into the database.
- Tour commercial models now include `company` alongside `private`, `group`, and `tip_based`.
- Tour list endpoints now support filtering by one or many tag keys and one or many tour types for both admin and public reads.
