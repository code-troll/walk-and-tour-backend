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
- global validation behavior from the NestJS `ValidationPipe`
- business-rule validation notes that are not obvious from OpenAPI alone
- tour-specific schema and publication mechanics for admin UI workflows
- explicit notes that tours and blog posts have a shared non-localized top-level `name` field in admin payloads/responses, and that translations do not include `name`
- admin tag deletion semantics, including cascade-removal of tag associations before delete

## Current Notes

- The Swagger models under `src/swagger/swagger.models.ts` describe outgoing response payloads.
- Incoming request schemas are documented directly on controller DTOs.
- Admin tour and blog schemas now include a shared top-level `name` field for internal identification.
- Tour and blog translations continue to own localized titles/content, not the shared `name`.
- Swagger remains the machine-readable contract; `docs/admin-frontend-api.md` is the curated frontend implementation guide.
