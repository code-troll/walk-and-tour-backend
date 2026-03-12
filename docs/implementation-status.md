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

### Layer 3: Admin authentication and authorization

Completed in this step:

- Added `Role` and `AdminUser` persistence plus a new migration for seeded fixed roles and local admin-user storage.
- Added Auth0-backed bearer token verification and local admin identity resolution for admin routes.
- Added role-based route protection across admin controllers with `super_admin` and `editor` access boundaries.
- Added protected admin-auth endpoints for resolving the current admin identity and stateless logout behavior.
- Added protected admin-user and role endpoints for `super_admin` management flows.
- Removed request-body audit attribution from tour writes and now derive audit actor data from the authenticated local admin user.
- Added bootstrap configuration for the first `super_admin` mapping through environment variables when the admin table is empty.

This layer intentionally does **not** include:

- Public read APIs
- Blog modules
- Newsletter subscriber workflows
- Storage or email provider integrations
- A full invitation email workflow or password bootstrap UX beyond Auth0 plus local admin bootstrap mapping

## Next Layer

### Layer 4: Blog management and public read APIs

The next step should implement the first public-facing content slice:

- Add `BlogPost` and `BlogPostTranslation` persistence, admin-internal CRUD, and publication workflows.
- Expose public read APIs for published tours and blog posts with locale-aware availability rules.
- Keep the public API unauthenticated while preserving the current admin protection model.
- Reuse the current language, tag, and publication concepts instead of creating a parallel content model.
- Leave newsletter subscriber flows and storage/email provider integrations for later layers.

## Working Notes

- `docs/` contains requirement and schema files that remain the source material for the implementation.
- The current admin routes expect an Auth0 access token whose `sub` and `email` can be mapped to a local `AdminUser`.
- If the local admin table is empty, `AUTH_BOOTSTRAP_SUPER_ADMIN_EMAIL` optionally creates the first bootstrap admin mapping on startup.
- Tour translation validation supports incomplete draft payloads by relaxing `required` fields until a locale becomes `ready` or `published`.
