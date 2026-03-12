# walk-and-tour-backend

NestJS backend for Walk and Tour. The current implementation includes:

- admin authentication and role-based authorization with Auth0-backed identity mapping
- admin management for languages, tags, tours, blog posts, and newsletter subscribers
- public read APIs for tours and blog posts
- newsletter double opt-in lifecycle with provider-backed confirmation delivery
- provider abstractions for email delivery and object storage

Implementation tracking lives in `docs/implementation-status.md`.

## Tech Stack

- Runtime: Node.js 22
- Framework: NestJS 11
- Language: TypeScript
- Database: PostgreSQL
- ORM: TypeORM
- Validation: `class-validator`, `class-transformer`, AJV
- Auth: Auth0 for admin bearer-token verification
- API docs: Swagger/OpenAPI at `/api/docs`
- Testing: Jest
- Linting: ESLint flat config

## Main Modules

- `src/admin-auth`: Auth0 token verification and admin request resolution
- `src/admin-users`: local admin users and role catalog
- `src/languages`: enabled locale configuration
- `src/tags`: global tag dictionary with per-locale labels
- `src/tours`: admin and public tour APIs with schema-driven localized content
- `src/blog-posts`: admin and public blog APIs
- `src/newsletter-subscribers`: subscribe, confirm, unsubscribe, admin list/detail/export
- `src/providers/email`: console and Resend-backed email delivery adapters
- `src/storage`: local-filesystem and Supabase-backed storage adapters

## Environment

Start from `.env.example`.

Important groups:

- app/runtime:
  - `PORT`
  - `NODE_ENV`
  - `APP_NAME`
  - `APP_BASE_URL`
- database:
  - `DB_HOST`
  - `DB_PORT`
  - `DB_NAME`
  - `DB_USER`
  - `DB_PASSWORD`
- auth:
  - `AUTH0_ISSUER_BASE_URL`
  - `AUTH0_AUDIENCE`
  - `AUTH_BOOTSTRAP_SUPER_ADMIN_EMAIL`
  - `AUTH_BOOTSTRAP_SUPER_ADMIN_SUB`
- email providers:
  - `EMAIL_PROVIDER=console|resend`
  - `EMAIL_FROM`
  - `RESEND_API_KEY`
- storage providers:
  - `STORAGE_DRIVER=local|supabase`
  - `LOCAL_STORAGE_ROOT`
  - `LOCAL_STORAGE_PUBLIC_BASE_URL`
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SUPABASE_BUCKET`

Notes:

- `EMAIL_PROVIDER=console` is the safe default for development. Newsletter confirmation emails are logged instead of being sent.
- `STORAGE_DRIVER=local` is the safe default for development.
- admin endpoints boot without valid Auth0 credentials, but protected admin requests will only work with a valid bearer token and local admin mapping.

## Run Locally

Prerequisites:

- Node.js 22+
- PostgreSQL 16+ running locally

Setup:

```bash
npm ci
cp .env.example .env
npm run migration:run
npm run seed:local
npm run start:dev
```

App URLs:

- API base: `http://localhost:3000/api`
- Swagger UI: `http://localhost:3000/api/docs`
- OpenAPI JSON: `http://localhost:3000/api/docs-json`
- Health: `http://localhost:3000/api/health`

## Local Seed Data

The repository includes a destructive local development seed command:

```bash
npm run seed:local
```

Behavior:

- resets seeded application data for a predictable local environment
- preserves migration-owned role and language foundations
- recreates a full demo dataset for manual testing

What gets seeded:

- one active local admin user
- multilingual tag dictionary entries
- several tours covering published, unpublished, draft, paid, tip-based, descriptive, and stop-based cases
- several blog posts covering published and draft cases
- newsletter subscribers across `pending_confirmation`, `subscribed`, and `unsubscribed`

Seeded admin:

- email: `admin@example.com`
- role: `super_admin`
- status: `active`
- `auth0UserId`: `null`

Important:

- this does **not** bypass Auth0
- local admin access still requires a valid Auth0 bearer token
- on first successful login, the Auth0 user must use the same email as the seeded admin so the local record can be bound automatically

Useful seeded newsletter tokens:

- pending confirmation token: `111111111111111111111111111111111111111111111111`
- active unsubscribe token: `222222222222222222222222222222222222222222222222`
- unsubscribed token: `333333333333333333333333333333333333333333333333`

## Run With Docker Compose

This is the lowest-friction way to boot the backend with PostgreSQL.

```bash
docker compose up --build
```

What it does:

- starts PostgreSQL 16
- builds the NestJS application image
- runs database migrations automatically before starting the app
- exposes PostgreSQL on `localhost:5432`
- exposes the API on `localhost:3000`

Compose files:

- `docker-compose.yaml`
- `Dockerfile`

Compose defaults:

- database user/password: `postgres` / `postgres`
- database name: `walk_and_tour`
- email provider: `console`
- storage driver: `local`

If you also want the seeded demo catalog inside the running container:

```bash
docker compose exec app npm run seed:local
```

Stop the stack:

```bash
docker compose down
```

To remove the database volume too:

```bash
docker compose down -v
```

## Database and Migrations

TypeORM migrations are the source of truth for schema changes.

Commands:

```bash
npm run migration:run
npm run migration:revert
npm run migration:show
npm run seed:local
```

Current domain persistence includes:

- languages
- tags
- tours
- tour translations and itinerary stops
- blog posts and blog translations
- admin users and roles
- newsletter subscribers

## API Documentation

- `GET /api/docs`: interactive Swagger UI
- `GET /api/docs-json`: raw OpenAPI document

Swagger notes and scope live in `docs/api-documentation.md`.

## Quality Checks

```bash
npm run lint
npm run lint:fix
npm test
npm run test:cov
npm run build
```

Testing notes and the current coverage scope live in `docs/testing.md`.

## Technical Notes

- Tour localized content is schema-driven. Each tour stores a JSON Schema that validates localized translation payloads.
- Public tour visibility is strict: no locale fallback, no unpublished tours, no unpublished translations, and no invalid localized payloads.
- Blog posts use shared metadata plus per-locale HTML translations.
- Newsletter subscribers use double opt-in. Confirmation and unsubscribe links are tokenized.
- Provider integrations are behind application-level abstractions so email/storage backends can change without rewriting domain modules.
- Storage adapters exist, but no media upload API is exposed yet.
- Resend and Supabase support are present at the adapter layer; live provider verification depends on real credentials and environment configuration.
