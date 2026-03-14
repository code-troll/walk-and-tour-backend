# Admin Frontend API Guide

This document is the frontend-oriented guide to the current backend API. It covers the full implemented API surface, but it is organized around admin frontend development first and public endpoints second.

Use this together with:

- Swagger UI: `/api/docs`
- OpenAPI JSON: `/api/docs-json`
- Tour translation schema: `docs/tour-content-schema.json`
- Full tour aggregate schema: `docs/tour-schema.json`

Operational endpoint not covered in detail here:

- `GET /api/health` exists for service monitoring and environment inspection, but it is not usually part of admin frontend product flows.

## 1. Conventions

### Base URL and transport

- All routes are prefixed with `/api`.
- Protected admin routes use `Authorization: Bearer <Auth0 access token>`.
- Request and response bodies are JSON unless noted otherwise.
- `GET /api/admin/newsletter/subscribers/export` returns CSV, not JSON.
- Browser-based frontends on another origin require backend CORS allowlisting through `CORS_ALLOWED_ORIGINS`.

### Global validation behavior

The backend uses one global NestJS `ValidationPipe` with:

- `transform: true`
- `whitelist: true`
- `forbidNonWhitelisted: true`

Frontend implications:

- Unknown body fields are rejected with `400`.
- Query values such as newsletter `page` and `limit` are coerced into numbers before validation.
- DTO-declared constraints are enforced before service logic runs.
- UUID route params that use `ParseUUIDPipe` fail at the controller boundary with `400`.

### Shared patterns and enums

Locale code pattern:

- `^[a-z]{2}(?:-[A-Z]{2})?$`
- Examples: `en`, `es`, `it`, `en-US`

Admin roles:

- `super_admin`
- `editor`
- `marketing`

Admin user statuses:

- `invited`
- `active`
- `disabled`

Tour statuses:

- Tour translation `isReady`: `boolean`
- Tour translation `isPublished`: `boolean`

Tour enums:

- `tourType`: `private | group | tip_based`
- `commuteMode`: `walk | bike | bus | train | metro | tram | ferry | private-transport | boat | other`

Blog statuses:

- Blog `publicationStatus`: `draft | published`
- Blog translation `publicationStatus`: `published | unpublished`

Newsletter statuses:

- `pending_confirmation`
- `subscribed`
- `unsubscribed`

## 2. Authentication and Authorization

### Auth flow

The backend does not expose a username/password login endpoint.

Actual flow:

1. The admin frontend authenticates the user with Auth0.
2. The frontend sends the Auth0 access token as a bearer token to backend admin routes.
3. The backend verifies token signature, issuer, audience, and `sub`.
4. The backend resolves the Auth0 identity to a local `AdminUser`.

Identity resolution rules:

- First lookup is by `auth0UserId`.
- If no local match exists and the token includes `email`, the backend attempts first-login binding by email.
- First-login binding only succeeds when a local admin exists with the same normalized email and `auth0UserId = null`.

Status gates:

- `active`: allowed
- `invited`: rejected with `403`
- `disabled`: rejected with `403`

If no local admin can be resolved, the backend returns `401`.

### Auth endpoints

| Method | Path | Purpose | Auth |
| --- | --- | --- | --- |
| `GET` | `/api/admin/auth/me` | Resolve the current Auth0 token into the local admin context used by guarded routes. | Bearer token |
| `POST` | `/api/admin/auth/logout` | Describe logout behavior. This does not revoke a server session. | Bearer token |

`POST /api/admin/auth/logout` returns:

```json
{
  "logoutStrategy": "client_discard_bearer_token"
}
```

Frontend implication:

- Logout is client-side token disposal plus Auth0-side logout if the frontend uses it.
- There is no backend session to destroy.

### Role matrix

| Area | Routes | Allowed roles |
| --- | --- | --- |
| Admin auth | `/api/admin/auth/*` | Any authenticated mapped admin |
| Admin media | `/api/admin/media/*` | `super_admin`, `editor` |
| Admin users | `/api/admin/users*` | `super_admin` |
| Admin roles | `/api/admin/roles` | `super_admin` |
| Languages | `/api/admin/languages*` | `super_admin` |
| Tags | `/api/admin/tags*` | `super_admin`, `editor` |
| Tours | `/api/admin/tours*` | `super_admin`, `editor` |
| Blog posts | `/api/admin/blog-posts*` | `super_admin`, `editor` |
| Newsletter subscribers | `/api/admin/newsletter/subscribers*` | `super_admin`, `marketing` |

Authorization is enforced per route by `AdminRolesGuard`.

## 3. Error Model

### Common status codes

| Status | Meaning | Typical causes |
| --- | --- | --- |
| `400` | Request validation or business-rule failure | DTO validation, invalid UUID, unsupported schema keys, invalid publish state transitions |
| `401` | Authentication failure | Missing bearer token, malformed bearer token, invalid/expired Auth0 token, unmapped Auth0 identity |
| `403` | Authenticated but blocked | Missing role, `invited` admin, `disabled` admin |
| `404` | Resource not found | Unknown UUID, slug, locale-backed resource, or token |
| `409` | Conflict | Duplicate slug, duplicate language code, duplicate tag key, duplicate admin email/Auth0 mapping |

### Error payload shape

Most errors follow this shape:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
```

or:

```json
{
  "statusCode": 400,
  "message": [
    "slug must match /^[a-z0-9]+(?:-[a-z0-9]+)*$/"
  ],
  "error": "Bad Request"
}
```

Frontend handling guidance:

- Treat `401` as a login/token problem.
- Treat `403` as a permissions or account-status problem.
- Treat `400` as form feedback or workflow feedback.
- Do not assume `message` is always a string; it may be `string[]`.

## 4. Shared Response Shapes

These are the main response objects the admin frontend will consume.

### Authenticated admin

Returned by `GET /api/admin/auth/me`:

- `id: UUID`
- `email: string`
- `roleName: super_admin | editor | marketing`
- `status: invited | active | disabled`
- `auth0UserId: string`

### Role

- `name`
- `description`
- `permissions: string[]`
- `createdAt`
- `updatedAt`

### Admin user

- `id`
- `auth0UserId: string | null`
- `email`
- `roleName`
- `role`
- `status`
- `createdAt`
- `updatedAt`
- `lastLoginAt: string | null`

### Language

- `code`
- `name`
- `isEnabled`
- `sortOrder`
- `createdAt`
- `updatedAt`

### Tag

- `key`
- `labels: Record<localeCode, string>`
- `createdAt`
- `updatedAt`

### Audit metadata

Used on admin responses. Blog posts include all of these fields; tours include the create/update subset only:

- `createdBy: UUID | null`
- `updatedBy: UUID | null`
- `createdAt`
- `updatedAt`

## 5. Validation Mechanisms

The backend uses more than one validation layer. This matters for form UX and save/publish flows.

### Layer 1: DTO validation

Used on all controller bodies and query DTOs.

Examples:

- string patterns for locale codes, slugs, tag keys, and Auth0 subjects
- enum membership checks
- max lengths
- numeric ranges
- nested object validation
- unique-array enforcement for some array inputs

### Layer 2: Service-level business validation

Used when a value is structurally valid but still invalid in the domain.

Examples:

- duplicate language codes
- unknown role names
- duplicate admin emails
- duplicate Auth0 identity bindings
- tag labels referencing unregistered locales
- invalid publishability or locale completeness states

### Layer 3: Tour schema validation

Tours have an extra validation layer beyond DTOs.

Each tour stores a shared `contentSchema`. Each localized translation stores a `payload`.

Validation rules:

- `contentSchema` itself is validated against a restricted JSON Schema subset.
- `contentSchema` must declare `payload.cancellationType` as a required localized string field.
- translation `payload` is validated with AJV against that schema.
- draft translations are validated against a relaxed schema with `required` removed recursively.
- `ready` and `published` translations must satisfy the full schema.

Supported schema keys in v1:

- `$schema`
- `$ref`
- `$defs`
- `title`
- `description`
- `type`
- `properties`
- `required`
- `additionalProperties`
- `items`
- `oneOf`
- `enum`
- `const`
- `minimum`
- `maximum`
- `format`
- `pattern`

If a schema uses unsupported keys, the backend rejects it with `400`.

### Tour publication gating

A locale is publicly available only when all of the following are true:

- the shared tour data is valid for public rendering
- the requested locale is enabled
- the translation `isReady` is `true`
- the translation `isPublished` is `true`
- the localized `payload` satisfies the full `contentSchema`

Additional required localized lists for tour translations:

- `cancellationType: string`
- `highlights: string[]`
- `included: string[]`
- `notIncluded: string[]`

These localized fields are required for a locale to be publishable and public.

### Itinerary-specific tour validation

Two itinerary modes exist:

- `description`
- `stops`

For `description` itineraries:

- localized itinerary text lives inside the translation payload

For `stops` itineraries:

- shared stop order, IDs, coordinates, and connection metadata live on the tour
- localized stop `title` and `description` live inside the translation payload
- a public locale must provide localized entries for all shared stops

References:

- `docs/tour-content-schema.json`
- `docs/tour-schema.json`

## 6. Admin API

### 6.1 Admin Auth

#### `GET /api/admin/auth/me`

- Auth: bearer token required
- Roles: any authenticated mapped admin
- Use this during app bootstrap to resolve the backend session context

Response:

- authenticated admin identity
- local role
- local admin status

#### `POST /api/admin/auth/logout`

- Auth: bearer token required
- Roles: any authenticated mapped admin
- Returns logout instructions only

### 6.2 Admin Users

### 6.2 Admin Media

Routes:

| Method | Path | Roles |
| --- | --- | --- |
| `POST` | `/api/admin/media/upload` | `super_admin`, `editor` |

Purpose:

- Upload one image to the configured storage backend and receive a reusable media asset descriptor.

Request:

- `multipart/form-data`
- file field: `file`
- optional text field: `folder`

Response:

- `ref`
- `altText`
- `publicUrl`
- `contentType`
- `size`

Frontend notes:

- Upload does not modify a tour directly.
- Use the returned `ref` in `coverMediaRef` or `galleryMediaRefs`.
- `altText` returns as `null` from upload and is edited separately on the tour form.
- Only image uploads are accepted.

### 6.3 Admin Users

Routes:

| Method | Path | Roles |
| --- | --- | --- |
| `GET` | `/api/admin/users` | `super_admin` |
| `POST` | `/api/admin/users` | `super_admin` |
| `PATCH` | `/api/admin/users/:id` | `super_admin` |

Request rules:

- `:id` must be a UUID
- `email` is normalized to lowercase
- `roleName` must be one of the known roles
- `auth0UserId`, when present, must be a non-whitespace string
- `status`, when omitted on create, defaults to `invited`
- update supports `auth0UserId: null` to unlink the identity

Business rules:

- email must be unique
- Auth0 subject must be unique
- role must exist in the role table

Frontend notes:

- `GET /api/admin/users` returns expanded `role` objects, not only `roleName`
- first-login Auth0 binding can happen automatically via email match, even if the user was created without `auth0UserId`

### 6.4 Admin Roles

Routes:

| Method | Path | Roles |
| --- | --- | --- |
| `GET` | `/api/admin/roles` | `super_admin` |

Frontend notes:

- Use this to populate role selectors instead of hardcoding labels and descriptions in the UI.

### 6.5 Languages

Routes:

| Method | Path | Roles |
| --- | --- | --- |
| `GET` | `/api/admin/languages` | `super_admin` |
| `POST` | `/api/admin/languages` | `super_admin` |
| `PATCH` | `/api/admin/languages/:code` | `super_admin` |

Request rules:

- `code` must match the locale pattern
- `name` max length is `100`
- `sortOrder` must be an integer `>= 0`
- `isEnabled` is optional on create and defaults to `true`

Business rules:

- language code must be unique

Frontend notes:

- The backend treats languages as admin-managed data.
- Public content routes require the requested locale to be enabled.

### 6.6 Tags

Routes:

| Method | Path | Roles |
| --- | --- | --- |
| `GET` | `/api/admin/tags` | `super_admin`, `editor` |
| `POST` | `/api/admin/tags` | `super_admin`, `editor` |
| `PATCH` | `/api/admin/tags/:key` | `super_admin`, `editor` |
| `DELETE` | `/api/admin/tags/:key` | `super_admin`, `editor` |

Request rules:

- `key` pattern: `^[a-z0-9]+(?:-[a-z0-9]+)*$`
- `key` max length: `100`
- `labels` is a locale-keyed object of strings
- `labels` cannot be empty

Business rules:

- tag key must be unique
- every label locale must exist in the language table
- each label value must be a non-empty string

Frontend notes:

- The backend returns tags ordered by key.
- Tag labels are shared dictionary data used by tours and blog posts.
- Deleting a tag first removes its associations from tours and blog posts, then deletes the tag itself.
- Successful delete returns `204 No Content`.

### 6.7 Tours

Routes:

| Method | Path | Roles |
| --- | --- | --- |
| `GET` | `/api/admin/tours` | `super_admin`, `editor` |
| `GET` | `/api/admin/tours/:id` | `super_admin`, `editor` |
| `POST` | `/api/admin/tours` | `super_admin`, `editor` |
| `PATCH` | `/api/admin/tours/:id` | `super_admin`, `editor` |
| `POST` | `/api/admin/tours/:id/translations` | `super_admin`, `editor` |
| `PATCH` | `/api/admin/tours/:id/translations/:languageCode` | `super_admin`, `editor` |
| `DELETE` | `/api/admin/tours/:id/translations/:languageCode` | `super_admin`, `editor` |
| `POST` | `/api/admin/tours/:id/translations/:languageCode/publish` | `super_admin`, `editor` |
| `POST` | `/api/admin/tours/:id/translations/:languageCode/unpublish` | `super_admin`, `editor` |

Shared field note:

- `name` belongs to the base `Tour` entity only.
- `name` is not localized.
- `name` is not part of any translation payload or translation record.
- `name` is intended for admin/internal identification, while public-facing titles remain localized in translations.

Top-level request shape:

- `POST /api/admin/tours` only accepts:
  - `name`
  - `slug`
  - `tourType`
- All other shared tour fields are added later through `PATCH /api/admin/tours/:id`.

Patch request shape:

- `name`
- `slug`
- `coverMediaRef?`
- `galleryMediaRefs?`
- `contentSchema`
- `price?`
- `rating`
- `reviewCount`
- `tourType`
- `durationMinutes`
- `startPoint`
- `endPoint`
- `itinerary`
- `tagKeys`

Translation create request shape:

- `languageCode`
- `bookingReferenceId?`
- `payload`

Translation patch request shape:

- `bookingReferenceId?`
- `payload?`

Translation delete behavior:

- `DELETE /api/admin/tours/:id/translations/:languageCode`
- returns `204 No Content`
- permanently removes that locale translation from the tour

Translation publish request shape:

- `bookingReferenceId?`

Translation note:

- translation payloads carry localized fields such as `title` and `cancellationType`
- translations do not include a separate `name`
- `isReady` is returned by the backend but is derived from translation completeness and must not be sent by the frontend
- translation save endpoints do not accept `isPublished`; publish/unpublish is only available through the dedicated translation endpoints

Key DTO rules:

- `name` is required on create and max length `255`
- `slug` pattern: `^[a-z0-9]+(?:-[a-z0-9]+)*$`
- `slug` max length: `150`
- `tourType` is required on create
- `coverMediaRef` uses `{ ref, altText? }`
- `galleryMediaRefs` is an array of `{ ref, altText? }`
- media `ref` max length: `255`
- media `altText` is optional and keyed by locale code
- media `altText` values must be non-empty strings with max length `255`
- `rating` must be between `1` and `5`
- `reviewCount` must be `>= 0`
- `durationMinutes` must be `>= 0`
- `tagKeys` must be unique
- `itinerary.variant` must be `description` or `stops`
- stop IDs use the same slug-like pattern as other stable keys

Update semantics:

- shared fields are partially updated
- if `itinerary` is included, the shared itinerary is replaced
- shared save endpoints do not accept translations or any publish/unpublish intent
- translations can be created before `contentSchema` exists; they are stored with `isReady = false`
- translation publish is rejected unless the backend calculates the translation as ready
- updating shared tour fields recalculates readiness for existing translations and auto-unpublishes any translation that becomes not ready
- updating a translation recalculates readiness and auto-unpublishes it when it becomes not ready

Admin response shape includes:

- shared `name`
- shared tour data
- expanded `tags`
- `translations` keyed by locale code
- `translationAvailability[]` diagnostics
- `audit`

`translationAvailability[]` is especially important for the admin UI. Each locale entry includes:

- `languageCode`
- `isReady`
- `isPublished`
- `missingRequiredLists`
- `missingStopTranslations`
- `isSchemaValid`
- `publiclyAvailable`

Frontend notes:

- Expect newly created tours to come back with nullable shared fields such as `contentSchema`, `rating`, `reviewCount`, `durationMinutes`, `startPoint`, `endPoint`, and `itinerary`.
- Use `translationAvailability` to drive publishability indicators and per-locale warnings.
- Do not assume a translation is public just because it exists or even because it is marked `isPublished`; shared tour completeness still gates public exposure.
- Do not keep a frontend-owned `isReady`; always read the backend-calculated value from responses.
- `cancellationType`, `highlights`, `included`, and `notIncluded` are translation-owned fields.
- `payload` is intentionally schema-driven and should be edited against the tour's `contentSchema`.

### 6.8 Blog Posts

Routes:

| Method | Path | Roles |
| --- | --- | --- |
| `GET` | `/api/admin/blog-posts` | `super_admin`, `editor` |
| `GET` | `/api/admin/blog-posts/:id` | `super_admin`, `editor` |
| `POST` | `/api/admin/blog-posts` | `super_admin`, `editor` |
| `PATCH` | `/api/admin/blog-posts/:id` | `super_admin`, `editor` |

Shared field note:

- `name` belongs to the base `BlogPost` entity only.
- `name` is not localized.
- `name` is not part of any translation record.
- `name` is intended for admin/internal identification, while public-facing titles remain localized in translations.

Top-level request shape:

- `name`
- `slug`
- `heroMediaRef?`
- `publicationStatus`
- `tagKeys?`
- `translations?`

Translation request shape:

- `languageCode`
- `publicationStatus`
- `title?`
- `summary?`
- `htmlContent?`
- `seoTitle?`
- `seoDescription?`
- `imageRefs?`

Translation note:

- blog translations still carry localized `title` and content fields
- translations do not include a separate `name`

Key DTO rules:

- `name` is required on create and max length `255`
- `slug` pattern: `^[a-z0-9]+(?:-[a-z0-9]+)*$`
- `slug` max length: `150`
- `heroMediaRef` max length: `255`
- `tagKeys` must be unique
- `translations` must be unique by `languageCode`
- `title` max length: `255`
- `seoTitle` max length: `255`

Publication behavior:

- blog posts have top-level publication state
- each translation has its own publication state
- public routes only expose locales where both parent and translation are published

Admin response shape includes:

- shared `name`
- shared post fields
- expanded `tags`
- `translations` keyed by locale code
- `translationAvailability[]`
- `audit`

Frontend notes:

- updates merge translations by locale code
- HTML content is stored and returned as HTML, not rich-text blocks or Markdown

### 6.9 Newsletter Subscribers

Routes:

| Method | Path | Roles |
| --- | --- | --- |
| `GET` | `/api/admin/newsletter/subscribers` | `super_admin`, `marketing` |
| `GET` | `/api/admin/newsletter/subscribers/export` | `super_admin`, `marketing` |
| `GET` | `/api/admin/newsletter/subscribers/:id` | `super_admin`, `marketing` |

List query params:

- `q?`: email search, max length `255`
- `status?`: one of `pending_confirmation | subscribed | unsubscribed`
- `page?`: integer, default `1`, minimum `1`
- `limit?`: integer, default `50`, min `1`, max `200`

List response:

- `items`
- `total`
- `page`
- `limit`

Subscriber detail fields:

- `id`
- `email`
- `subscriptionStatus`
- `preferredLocale`
- `consentSource`
- `sourceMetadata`
- `consentedAt`
- `confirmedAt`
- `unsubscribedAt`
- `createdAt`
- `updatedAt`

CSV export:

- content type: `text/csv; charset=utf-8`
- file name: `newsletter-subscribers.csv`
- uses the same `q` and `status` filters as the list route

Frontend notes:

- list ordering is newest consent first, then email
- search is case-insensitive email substring matching
- the admin API is read-only for subscribers in the current implementation

## 7. Public API Appendix

These routes are not protected. They are included here because the admin frontend may still use them for preview tooling, QA tooling, or shared frontend infrastructure.

### 7.1 Public Tours

Routes:

| Method | Path |
| --- | --- |
| `GET` | `/api/public/tours?locale=<code>` |
| `GET` | `/api/public/tours/:slug?locale=<code>` |

Rules:

- `locale` is required
- no locale fallback exists
- only tours with valid shared public data are returned
- only locales that are enabled, `ready`, `published`, and schema-valid are returned

Public tour response includes:

- shared tour fields
- localized `translation`
- localized `itinerary`
- localized tag labels for the requested locale

### 7.2 Public Blog Posts

Routes:

| Method | Path |
| --- | --- |
| `GET` | `/api/public/blog-posts?locale=<code>` |
| `GET` | `/api/public/blog-posts/:slug?locale=<code>` |

Rules:

- `locale` is required
- no locale fallback exists
- only parent-published blog posts with translation-published locales are returned

Public blog response includes:

- shared blog fields
- localized `translation`
- localized tag labels for the requested locale
- `publishedAt`

### 7.3 Public Newsletter Subscription

Routes:

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/public/newsletter/subscribers/subscribe` | Start or restart double opt-in |
| `POST` | `/api/public/newsletter/subscribers/confirm` | Confirm by token in JSON body |
| `GET` | `/api/public/newsletter/subscribers/confirm?token=...` | Confirm by direct email link |
| `POST` | `/api/public/newsletter/subscribers/unsubscribe` | Unsubscribe by token in JSON body |
| `GET` | `/api/public/newsletter/subscribers/unsubscribe?token=...` | Unsubscribe by direct email link |

Subscribe request body:

- `email`
- `preferredLocale?`
- `consentSource?`
- `sourceMetadata?`

Subscribe behavior:

- email is normalized
- new or reactivated requests move the subscriber to `pending_confirmation`
- already subscribed emails are accepted without error and return `alreadySubscribed: true`
- confirmation and unsubscribe links are provider-delivered by email

Confirm and unsubscribe token rules:

- invalid token returns `404`
- confirm requires `pending_confirmation`, otherwise `400`
- unsubscribe is idempotent for already unsubscribed users

## 8. Frontend Implementation Notes

- Use `GET /api/admin/auth/me` as the backend session bootstrap call after acquiring an Auth0 token.
- Build admin route guards around backend `roleName`, not only Auth0 claims.
- Treat publishability as backend-derived state, especially for tours.
- Prefer reading enums and response details from Swagger for generated clients, but use this document for workflow behavior and validation interpretation.
- For tours, the admin UI should expose schema validation feedback separately from DTO validation feedback because both can fail independently.
