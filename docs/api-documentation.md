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
- newsletter subscribe, confirm, unsubscribe, list, detail, and export contracts
- enum values, field descriptions, nullable fields, and dynamic locale-keyed objects
- bearer-token requirements for protected admin routes

## Current Notes

- The Swagger models under `src/swagger/swagger.models.ts` describe outgoing response payloads without changing runtime service behavior.
- Incoming schemas are documented directly on the DTO classes used by controllers.
- The spec is intended to stay aligned with the current layer-4 API surface while layer 5 remains the next implementation target.
