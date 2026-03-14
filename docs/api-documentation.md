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
- Tour media fields use shared media asset objects: `coverMediaRef` is `{ ref, altText? }` and `galleryMediaRefs` is an array of the same shape.
- `POST /api/admin/tours` is intentionally minimal and accepts only `name`, `slug`, and `tourType`; the rest of the shared tour data is filled in later with `PATCH`.
- Tour writes are now split across base-tour endpoints and nested translation endpoints: shared tour saves do not accept translations, and translation publication changes only through `/publish` and `/unpublish` translation routes.
- Tour translations can also be removed through `DELETE /api/admin/tours/:id/translations/:languageCode`.
- Admin tour responses may include `null` for draft-only shared fields such as `contentSchema`, `rating`, `reviewCount`, `durationMinutes`, `startPoint`, `endPoint`, and `itinerary`.
- Admin uploads use `POST /api/admin/media/upload` and return a reusable media asset descriptor with `ref`, `publicUrl`, `contentType`, and `size`.
- Tours and blog posts no longer expose or persist a `category` field.
- Swagger remains the machine-readable contract; `docs/admin-frontend-api.md` is the curated frontend implementation guide.
- `docs/backend.yaml` should be regenerated from the Nest Swagger document with `npm run openapi:export` instead of being hand-maintained.
