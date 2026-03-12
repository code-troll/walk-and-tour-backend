# walk-and-tour-backend

Layers 1 through 5 are in place: NestJS foundation, PostgreSQL/TypeORM setup, admin content modules, Auth0-backed admin authentication, public read APIs for tours and blog posts, and newsletter subscriber lifecycle APIs.

Implementation tracking lives in `docs/implementation-status.md`.

## API Docs

- `GET /api/docs`: interactive Swagger UI
- `GET /api/docs-json`: raw OpenAPI document

Swagger notes and scope live in `docs/api-documentation.md`.

## Testing

- `npm test`: run the Jest unit suite
- `npm run test:cov`: run the suite with coverage reporting
- `npm run build`: verify the application still compiles after test changes

Testing notes and the current coverage scope live in `docs/testing.md`.
