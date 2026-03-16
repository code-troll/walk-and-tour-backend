# API Documentation

Swagger/OpenAPI is generated from the NestJS controllers, DTOs, and Swagger models.

## Endpoints

- `GET /api/docs`: interactive Swagger UI
- `GET /api/docs-json`: raw OpenAPI JSON document

## Frontend Guide

For human-oriented frontend documentation, use:

- `docs/admin-frontend-api.md`

That guide adds:

- the full route inventory divided into admin and public sections
- the Auth0-to-local-admin authentication flow
- the route role matrix
- the admin media upload flow
- global validation behavior from the NestJS `ValidationPipe`
- business-rule validation notes that are not obvious from OpenAPI alone
- tour-specific schema and publication mechanics for admin UI workflows
- explicit notes that tours and blog posts have a shared non-localized top-level `name` field in admin payloads/responses, and that translations do not include `name`
- admin tag deletion semantics, including cascade-removal of tag associations before delete

## Current Notes

- The Swagger models under `src/swagger/swagger.models.ts` describe outgoing response payloads.
- Incoming request schemas and field-level validation rules are documented directly on controller DTOs.
- Request validation constraints such as `minLength`, `maxLength`, `pattern`, `minimum`, `maximum`, and `uniqueItems` should be defined on the DTOs and reflected in their Swagger decorators.
- Tag label values are limited to 100 characters per locale entry.
- Admin tour and blog schemas now include a shared top-level `name` field for internal identification.
- Tour and blog translations continue to own localized titles/content, not the shared `name`.
- Tour `cancellationType` is localized and lives inside each translation payload/response rather than on the shared tour object.
- Tour translation `isReady` is output-only: the backend calculates it from translation completeness, stores it on `tour_translations.is_ready`, and does not accept it in requests.
- Tour translation publication is represented as `isPublished` on `tour_translations`, while tour-level public visibility is derived from shared tour completeness plus at least one published-ready translation.
- Blog translation publication is represented as `isPublished` on `blog_post_translations`; blog posts no longer store a parent publication status, and admin writes are split between shared blog routes and nested translation publish routes.
- Tours now attach reusable media assets through dedicated nested admin routes, while public tour responses still expose resolved `coverMedia` and `galleryMedia`.
- Tours now persist a shared `sortOrder` field that controls the default ordering for both admin and public tour list endpoints.
- `POST /api/admin/tours` is intentionally minimal and accepts `name`, `slug`, `tourType`, and optional `sortOrder`; the rest of the shared tour data is filled in later with `PATCH`.
- Tour writes are now split across base-tour endpoints and nested translation endpoints: shared tour saves do not accept translations, and translation publication changes only through `/publish` and `/unpublish` translation routes.
- Tour translations can also be removed through `DELETE /api/admin/tours/:id/translations/:languageCode`.
- Admin tour responses may include `null` for draft-only shared fields such as `contentSchema`, `rating`, `reviewCount`, `durationMinutes`, `startPoint`, `endPoint`, and `itinerary`.
- Supported `tourType` values now include `company` in addition to `private`, `group`, and `tip_based`.
- Admin and public tour list endpoints now return tours by `sortOrder` ascending and support optional `tagKeys` and `tourTypes` query filters, accepting comma-separated values or repeated query params and matching any provided tag/type within each filter group.
- Admin media now exposes a browsable shared library through `GET /api/admin/media` and `GET /api/admin/media/:id`, file streaming through `GET /api/admin/media/:id/content`, image/video upload through `POST /api/admin/media`, and deletion through `DELETE /api/admin/media/:id`.
- Admin media list/detail/upload responses now expose both `adminContentUrl` and `publicContentUrl`; `publicContentUrl` points to `GET /api/media/:id/content`, while tour/blog attached media responses still use a single scoped `contentUrl`.
- Tours now manage media associations through `GET/POST /api/admin/tours/:id/media`, `PATCH/DELETE /api/admin/tours/:id/media/:mediaId`, and dedicated cover assignment routes.
- Blog posts now manage hero media through `GET /api/admin/blog-posts/:id/media`, `POST /api/admin/blog-posts/:id/hero-media`, and `DELETE /api/admin/blog-posts/:id/hero-media`.
- Blog posts now manage localized content through nested translation routes, including dedicated publish/unpublish endpoints and translation deletion by locale.
- Public media is exposed through the generic route `GET /api/media/:id/content` and the content-scoped routes `GET /api/public/tours/:slug/media/:mediaId` and `GET /api/public/blog-posts/:slug/media/:mediaId`.
- Public media remains API-mediated even with the Railway storage driver; bucket objects are not exposed as direct public URLs.
- Tours and blog posts no longer expose or persist a `category` field.
- Swagger remains the machine-readable contract; `docs/admin-frontend-api.md` is the curated frontend implementation guide.
- `docs/backend.yaml` should be regenerated from the Nest Swagger document with `npm run openapi:export` instead of being hand-maintained.
