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
- Updated newsletter direct-link GET confirmation and unsubscribe endpoints to redirect to the configured public app and added request throttling to the public newsletter routes.
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
- Admin media library responses now split media URLs into `adminContentUrl` for authenticated previews and `publicContentUrl` for the new public media route `GET /api/media/:id/content`.
- Tours now manage media associations through dedicated nested endpoints instead of embedding media changes in `PATCH /api/admin/tours/:id`.
- Blog posts now attach and clear shared hero media through dedicated media endpoints and return resolved `heroMedia` objects instead of raw hero storage refs.
- Public media is now exposed through the generic `/api/media/:id/content` route in addition to the tour/blog-scoped public media routes.
- Admin tag deletion now performs an application-level cascade by removing tag associations from tours and blog posts before deleting the tag record.
- Editors can now read the admin languages catalog through `GET /api/admin/languages`, while language creation and updates remain restricted to `super_admin`.
- Tour writes are now split: shared tour data is saved through base-tour endpoints, translations are saved through nested translation endpoints, and translation publish/unpublish is only available through dedicated translation routes.
- Tour translations can now be permanently removed through a dedicated nested delete endpoint.
- Blog posts now follow the same publication model as tours: shared blog writes are separate from nested translation create/update/delete routes, only `blog_post_translations.is_published` is stored, and blog-level `publishedAt` is derived from translation publish actions.
- Blog post translations now track locale-specific public `viewCount`, with deduplicated counting on successful public detail reads using a 24-hour client-IP-hash window per translation.
- Tour catalog imports now have a canonical authoring contract in `docs/tour-migration-input.schema.json`, plus a data migration that reads `tour-migration-input.json` and upserts the prepared tour catalog into the database.
- Tour commercial models now include `company` alongside `private`, `group`, and `tip_based`.
- Tour list endpoints now support filtering by one or many tag keys and one or many tour types for both admin and public reads.
- Tours now persist a manual `sortOrder`, admin writes can set or move that order, and both admin/public tour list endpoints use it as their default ordering.
- Admin tour listings now return a lightweight summary shape with per-locale `isReady`/`isPublished` flags and audit metadata, while the admin detail endpoint continues to return the full aggregate.
- The OpenAPI export module keeps a hand-maintained controller list; the proposals controllers were missing from it, so `docs/backend.yaml` omitted the whole proposals surface despite the export discipline. Both proposals controllers are now registered, and any new controller must be added there in the same change that creates it.
- Admin first-login binding by email now requires an `email_verified: true` claim on the access token. The tenant is expected to host more than one population of identities against a single API audience, so an unverified email claim would otherwise be enough for an identity from another connection to claim a pending admin invitation.
- Hotels are now registered through `/api/admin/hotels`, restricted to `super_admin`. A hotel stores name, address, phone, a contact email and a unique eight-digit Danish CVR number; the CVR is normalized on input so spaced digits and a `DK` prefix cannot register the same company twice.
- The tours a hotel may sell are grants in `hotel_tours`, replaced as a set through `PUT /api/admin/hotels/:id/tours`. Grants are revoked rather than deleted so the record of what a hotel was allowed to sell survives, surviving grants keep their original grant date, and a partial unique index allows only one live grant per hotel/tour pair while permitting the pair to repeat across its history. `hotel_tours.tour_id` is `ON DELETE RESTRICT` so retiring a tour cannot erase that history.
- Each hotel now has exactly one access user in `hotel_users`, created through `POST /api/admin/hotels/:id/user`. The username is derived from the hotel name with Danish transliteration applied before normalization, so `Søborg` becomes `soeborg` and cannot collide with a hotel actually named `Soborg`; collisions take a numeric suffix. The sign-in email is stored separately from the hotel contact email because the identity provider enforces a unique email per connection.
- Sign-in identities are created through an `IdentityProvider` abstraction with `console` and Auth0 implementations, selected by `IDENTITY_PROVIDER`. `console` is the default so the invitation flow works locally without machine credentials; it logs a usable setup URL. The Auth0 implementation caches its management token, is fetched lazily so the application still boots without credentials, and reports rate limiting explicitly.
- The local row and the identity are separate sources of truth. The username is reserved locally first, and if the identity provider then refuses it the local row is deleted rather than left pointing at nothing.
- Passwords are never set or seen by the backend or an administrator. The hotel chooses its own through a provider-issued ticket emailed to it, and the same route re-sends that link for a reset.
- `GET /api/admin/hotels/:id/user` reports `404` when a hotel has no access user yet, which is the state every hotel starts in, rather than returning a null body.
- Hotel-facing requests are guarded by `HotelJwtAuthGuard`, which shares Auth0 token verification with the admin side and then resolves the subject against `hotel_users` and nowhere else. Both populations sit in one tenant behind one API audience, so a verified token proves only that the identity is real; which population it belongs to is decided by that lookup. Resolution is by subject only, with no email fallback.
- The resolved user is written to `request.hotelUser`, never `request.admin`, because `AdminRolesGuard` reads the latter and is injectable everywhere.
- `invited` means the hotel has never signed in. Presenting a valid token proves the password was set, since the identity provider would not otherwise issue one, so the first successful resolution settles the user as `active`.
- Admin first-login binding now also refuses any identity that already belongs to a hotel access user, whatever address it presents. Together with the `email_verified` requirement this closes the path by which a hotel identity could have claimed a pending admin invitation.
- `GET /api/hotel/auth/me` returns the signed-in hotel, its access user and its live tour grants. Every field is derived from the token; no identifier is accepted from the caller.
- Hotels book tours through `POST /api/hotel/bookings`, scoped to the signed-in hotel: no hotel identifier is accepted from the request, the tour grant is re-checked and must still be live, and a booking belonging to another hotel reports `404` with a generic message rather than `403`.
- A booking's status is only ever changed through a named action. `ALLOWED_HOTEL_BOOKING_TRANSITIONS` in `src/shared/domain/hotel-booking.enums.ts` is the whole rule, keyed by actor type, and no endpoint accepts a status from a request body. A hotel may cancel a pending or confirmed booking; confirming, completing and invoicing are administrator actions, and `cancelled` and `invoiced` are terminal.
- The tour itself is a line item with `kind = 'base'`, so a booking's total is the sum of its lines under one rule rather than a base column plus adjustments. A partial unique index allows only one base line per booking, and the base line cannot be removed — cancelling the booking is the way out.
- Amounts are **exclusive of VAT** and denominated in DKK, enforced by a check constraint rather than left as free text. `unit_price_amount` and the currency are snapshotted when the booking is made, so a later change to a tour's price never rewrites a booking that quoted the old one. A tour with no price starts with no base line and reads as price-on-request.
- Money never passes through a float. `src/hotels/money.ts` parses decimal strings into minor units as `bigint` and is the only place that sums or multiplies amounts.
- `total_amount` is stored rather than derived on read, recomputed in one service method inside the same transaction as any line-item change. Invoicing freezes it: no line can be added or removed afterwards, and `isEstimate` — returned as data so clients do not each infer it — flips to false.
- Every change appends to `hotel_booking_logs`, including who made it. The actor label is denormalised so the history still says who acted after an account is removed.
