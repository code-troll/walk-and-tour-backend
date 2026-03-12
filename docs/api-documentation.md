# API Documentation

Swagger/OpenAPI documentation is now generated from the NestJS controllers and DTO/schema models.

## Endpoints

- `GET /api/docs`: interactive Swagger UI
- `GET /api/docs-json`: raw OpenAPI JSON document

## Scope

The generated specification currently documents:

- request body schemas for admin create/update endpoints
- public query and path parameters
- nested response schemas for admin and public read endpoints
- explicit localized tour list fields for `highlights`, `included`, and `notIncluded` in admin and public translation responses
- newsletter subscribe, confirm, unsubscribe, list, detail, and export contracts
- direct-link GET confirmation and unsubscribe routes used by provider-delivered emails
- enum values, field descriptions, nullable fields, and dynamic locale-keyed objects
- bearer-token requirements for protected admin routes

## Current Notes

- The Swagger models under `src/swagger/swagger.models.ts` describe outgoing response payloads without changing runtime service behavior.
- Incoming schemas are documented directly on the DTO classes used by controllers.
- The spec is intended to stay aligned with the current implemented API surface as the project moves beyond the six defined backend layers.
