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
- `src/admin-media`: admin media asset API backed by the shared storage abstraction
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
  - `CORS_ALLOWED_ORIGINS`
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
- `CORS_ALLOWED_ORIGINS` is a comma-separated list of browser origins allowed to call the backend, for example `http://admin.dev.walkandtour.dk:3001,http://localhost:3001`.
- `AUTH_BOOTSTRAP_SUPER_ADMIN_EMAIL` and `AUTH_BOOTSTRAP_SUPER_ADMIN_SUB` can bootstrap the first admin on an empty database.

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
- OpenAPI YAML export: `npm run openapi:export`
- Health: `http://localhost:3000/api/health`

Tour admin write flow:

- `POST /api/admin/tours` creates the shared tour shell
- `PATCH /api/admin/tours/:id` updates only shared tour fields
- `POST /api/admin/tours/:id/translations` and `PATCH /api/admin/tours/:id/translations/:languageCode` manage localized translations independently
- `DELETE /api/admin/tours/:id/translations/:languageCode` removes a locale translation
- translation publication changes only through `POST /api/admin/tours/:id/translations/:languageCode/publish` and `/unpublish`

Admin media upload:

- `GET /api/admin/media`
- `GET /api/admin/media/:id`
- `GET /api/admin/media/:id/content`
- `POST /api/admin/media`
- `DELETE /api/admin/media/:id`
- `GET /api/admin/tours/:id/media`
- `POST /api/admin/tours/:id/media`
- `PATCH /api/admin/tours/:id/media/:mediaId`
- `DELETE /api/admin/tours/:id/media/:mediaId`
- `POST /api/admin/tours/:id/cover-media`
- `DELETE /api/admin/tours/:id/cover-media`
- `GET /api/admin/blog-posts/:id/media`
- `POST /api/admin/blog-posts/:id/hero-media`
- `DELETE /api/admin/blog-posts/:id/hero-media`
- `GET /api/public/tours/:slug/media/:mediaId`
- `GET /api/public/blog-posts/:slug/media/:mediaId`

## Auth0 Setup

This backend does not implement username/password login itself. Protected admin routes expect an Auth0-issued bearer token whose:

- `iss` matches `AUTH0_ISSUER_BASE_URL`
- `aud` matches `AUTH0_AUDIENCE`
- `sub` can be mapped to a local `AdminUser`

### 1. Create a Custom Auth0 API

In Auth0 Dashboard:

- Go to `Applications > APIs`
- Create a custom API for this backend
- Use a stable API Identifier, for example:
  - `http://api.dev.walkandtour.dk/api`
- Signing algorithm: `RS256`

The API Identifier must exactly match:

- backend `AUTH0_AUDIENCE`
- frontend requested `audience`

Example backend `.env` values:

```env
AUTH0_ISSUER_BASE_URL=https://your-tenant.us.auth0.com
AUTH0_AUDIENCE=http://api.dev.walkandtour.dk/api
```

Important:

- `AUTH0_AUDIENCE` is an Auth0 API identifier, not necessarily the literal runtime backend URL
- do not use the built-in Auth0 Management API audience for this backend
- keep the value exactly identical across Auth0, backend, and frontend

### 2. Create or Configure the Frontend Application

In Auth0 Dashboard:

- Go to `Applications > Applications`
- Create or configure the admin frontend as a `Single Page Application`

For a local admin frontend running at `http://admin.dev.walkandtour.dk:3001`, typical Auth0 application settings are:

- Allowed Callback URLs:
  - `http://admin.dev.walkandtour.dk:3001/auth/callback`
- Allowed Logout URLs:
  - `http://admin.dev.walkandtour.dk:3001`
- Allowed Web Origins:
  - `http://admin.dev.walkandtour.dk:3001`

If you also use another local frontend origin, add it explicitly. Callback URLs must match exactly, including:

- scheme
- host
- port
- path

### 3. Authorize the Frontend Application To Call the API

After creating the custom API, make sure the frontend application is allowed to request tokens for it.

If Auth0 returns an error like:

- `Client is not authorized to access resource server ...`

then the SPA application has not been authorized for the custom API yet. Enable access for that application in the Auth0 API settings.

### 4. Configure the Frontend To Request the Same Audience

The frontend must request the same audience configured above, for example:

```env
AUTH0_AUDIENCE=http://api.dev.walkandtour.dk/api
BACKEND_AUTH0_AUDIENCE=http://api.dev.walkandtour.dk/api
BACKEND_API_BASE_URL=http://api.dev.walkandtour.dk:3000
APP_BASE_URL=http://admin.dev.walkandtour.dk:3001
```

The backend runtime URL can include a port for local development, while the Auth0 audience remains the stable API Identifier.

### 5. Map an Auth0 User To a Local Admin User

Successfully authenticating with Auth0 is not enough by itself. The backend still requires a local `AdminUser`.

Mapping logic:

- first lookup by `auth0UserId` against the Auth0 token `sub`
- fallback lookup by email when a local admin exists with the same email and `auth0UserId = null`
- admin status must be `active`

If no local admin is mapped, protected routes return:

- `401 No local admin user is mapped to this Auth0 identity.`

For local development, you can either:

- log in with the same email as the seeded admin (`admin@example.com`) on first login, or
- set the bootstrap env vars to your real Auth0 user

Example:

```env
AUTH_BOOTSTRAP_SUPER_ADMIN_EMAIL=you@example.com
AUTH_BOOTSTRAP_SUPER_ADMIN_SUB=google-oauth2|123456789012345678901
```

`AUTH_BOOTSTRAP_SUPER_ADMIN_SUB` must be the exact Auth0 user `sub` value, such as:

- `auth0|...`
- `google-oauth2|...`

If your database already contains admin users, update that admin record directly or start from a clean local database.

### 6. Common Failure Cases

- `Callback URL mismatch`
  - The frontend `redirect_uri` does not exactly match an Allowed Callback URL in Auth0.

- `Service not found`
  - The requested audience does not match any custom Auth0 API Identifier.

- `Client is not authorized to access resource server`
  - The frontend application is not authorized to request tokens for the custom API.

- `401 No local admin user is mapped to this Auth0 identity`
  - Auth0 login succeeded, but the backend could not map the token to a local admin record.

- `403 Admin user has not activated access yet` or `Admin user is disabled`
  - The local admin exists, but its status blocks access.

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

Docker Compose reads runtime values from the project `.env` file. Start by creating it if you have not already:

```bash
cp .env.example .env
```

The same `.env` file is used for host-side `npm run ...` commands and for the containers. Inside Docker Compose, the app service overrides only `DB_HOST=postgres` so the backend can connect to the database container while your host setup can still keep `DB_HOST=localhost`.

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

Compose defaults come from `.env.example`, including:

- `PORT=3000`
- `DB_NAME=walk_and_tour`
- `DB_USER=postgres`
- `DB_PASSWORD=postgres`
- `EMAIL_PROVIDER=console`
- `STORAGE_DRIVER=local`

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
Frontend-oriented API guidance lives in `docs/admin-frontend-api.md`.
The checked-in `docs/backend.yaml` should be regenerated with `npm run openapi:export` instead of edited by hand.

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

- Request validation requirements belong in the DTOs. Use `class-validator` for runtime enforcement and mirror the same limits in `@ApiProperty` / `@ApiPropertyOptional` so they appear in Swagger/OpenAPI.
- Tag labels are limited to 100 characters per locale entry.
- Tour localized content is schema-driven. Each tour stores a JSON Schema that validates localized translation payloads.
- Tours and blog posts also carry a shared non-localized `name` field for admin-side identification; localized public-facing titles remain on translations.
- Tours store `cancellationType` as localized free-text policy text inside each translation payload rather than on the shared tour record.
- Tours no longer embed raw media refs. They attach reusable uploaded media assets through dedicated nested admin endpoints, keep per-tour localized alt text on the attachment row, and assign the cover separately.
- Blog posts also use the shared media library, but hero media is now attached and cleared through dedicated blog media endpoints rather than core blog create/update payloads.
- Media bytes are no longer assumed to be reachable at `/media/...`. Admin clients fetch them through `GET /api/admin/media/:id/content`, while public clients fetch them only through tour/blog-scoped media routes.
- Admin media assets can be browsed through `GET /api/admin/media` and `GET /api/admin/media/:id`, created through `POST /api/admin/media`, and deleted through `DELETE /api/admin/media/:id`.
- Tags can be deleted through the admin API; deletion removes the tag from tours and blog posts before deleting the shared tag record.
- Public tour visibility is strict: no locale fallback, no unpublished tours, no unpublished translations, and no invalid localized payloads.
- Blog posts use shared metadata plus per-locale HTML translations.
- Newsletter subscribers use double opt-in. Confirmation and unsubscribe links are tokenized.
- Provider integrations are behind application-level abstractions so email/storage backends can change without rewriting domain modules.
- Resend and Supabase support are present at the adapter layer; live provider verification depends on real credentials and environment configuration.
- The OpenAPI export command uses a documentation-only Nest module, so it can regenerate `docs/backend.yaml` without a live database connection.
