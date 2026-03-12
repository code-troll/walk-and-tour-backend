# Walk and Tour Backend Requirements

## Summary

This document defines the v1 product and backend requirements for the Walk and Tour backend.

The backend will be implemented with NestJS on Node.js and PostgreSQL. It serves two audiences:

- Admin CMS users who manage content, languages, and newsletter subscribers.
- Public clients that consume published content and submit newsletter subscriptions.

This is a greenfield MVP specification. It defines required product behavior and backend capabilities while leaving detailed implementation choices open where noted.

## Product Goals

- Provide a secure admin backend for managing walking tour content and blog content.
- Support multilingual content for English, Spanish, and Italian at launch.
- Allow admins to configure which languages are enabled for use in the system.
- Expose public read APIs for published tours and blog posts.
- Store newsletter subscriptions in PostgreSQL and support public subscribe/unsubscribe flows.
- Establish a backend foundation that can later support bookings, customer accounts, and richer marketing features.

## Non-Goals for V1

- Tour bookings and payments.
- End-user/customer accounts.
- Scheduled publishing.
- Full newsletter campaign authoring or email sending workflows.

## Users and Roles

### Admin User Types

- `super_admin`
  - Full access to users, roles, content, languages, settings, and newsletter subscribers.
- `editor`
  - Can create, update, publish, and unpublish tours and blog posts.
  - Cannot manage admin users or system-level settings unless explicitly delegated later.
- `marketing`
  - Can view and manage newsletter subscribers.
  - Can view published content as needed for marketing operations.
  - Cannot manage admin users.

### Public Users

- Unauthenticated consumers of published tours and blog posts.
- Unauthenticated newsletter subscribers.

## Functional Requirements

### 1. Admin Authentication and Authorization

- The system must support authenticated admin access.
- Admin authentication must be implemented with Auth0 in v1.
- The system must enforce role-based authorization for admin operations.
- The system must support login.
- The system must support logout or equivalent token invalidation behavior.
- The system must support Auth0-backed password reset, password bootstrap, or an equivalent admin invitation flow.
- The system must map Auth0 identities to local admin users and their assigned roles.
- Protected operations must be denied when the current admin user lacks the required role.
- Admin actions that change data should be attributable to the acting admin user.

### 2. Language Management

- The system must support English, Spanish, and Italian in v1.
- The list of enabled languages must be configurable by admin users with sufficient permissions.
- Enabled languages must be stored in the system configuration, not hardcoded into content entries.
- Content entries may have translations for any subset of enabled languages.
- The system must expose translation availability or completeness per content entry.
- Disabling a language must not delete existing translations.
- Public APIs must only expose content in locales that exist and are publicly available.

### 3. Tour Management

- Admin users with the correct permissions must be able to create, edit, publish, unpublish, list, and view tours.
- A tour must support shared metadata, a JSON Schema definition for localized content, and language-specific translations that satisfy that schema.
- A tour must also support shared operational properties that are independent from translations, including price, rating, number of reviews, type, cancellation type, duration, starting point, and end point.
- Tour content must support draft and published states.
- Publishing must be a manual action.
- A tour may be published even if only a subset of enabled languages is available.
- The admin interface contract should expose which languages are available for a tour and which are missing.
- The tour-defined JSON Schema must be the source of truth for which localized fields exist, their types, and which of them are required.
- A tour translation may exist in an incomplete state, but a locale must satisfy the tour schema before it is treated as available for public APIs.
- Every tour must include an itinerary.
- A tour itinerary must support either a localized descriptive itinerary or a stop-based itinerary represented as a linked list of stops.
- For stop-based itineraries, each stop may link to the next stop through an optional connection that includes the next stop reference, optional duration, and commute mode.
- For stop-based itineraries, stop order and connection data are shared tour-level data, while each stop title is localized through the translation payload.
- Tours must define stable tag keys independently of translations. Tag labels may be localized per language, but the tag key must remain language-independent.
- Public APIs must return only published tours.
- Public APIs must support locale-aware responses for tour content.

### 4. Blog Post Management

- Admin users with the correct permissions must be able to create, edit, publish, unpublish, list, and view blog posts.
- A blog post must support shared metadata and language-specific translated content.
- Blog posts must support draft and published states.
- Publishing must be a manual action.
- A blog post may be published with incomplete translations.
- Public APIs must return only published blog posts.
- Public APIs must support locale-aware responses for blog content.

### 5. Newsletter Subscriber Management

- Public users must be able to subscribe to the newsletter.
- Public users must be able to unsubscribe from the newsletter.
- Newsletter subscriptions must be stored in PostgreSQL.
- The system must prevent invalid duplicate subscription states.
- Admin users with newsletter permissions must be able to list and search subscribers.
- The system should support subscriber export for operational use.
- The system must retain consent and unsubscribe audit data.
- Newsletter campaign creation and sending are out of scope for v1.

## Core Domain Model

The implementation may refine naming, but the following domain concepts are required.

### `AdminUser`

- Unique identifier
- Email
- Authentication credentials or external auth reference
- Role assignment
- Status
- Created/updated timestamps
- Last login timestamp

### `Role`

- Role name
- Permissions or fixed role mapping

### `Language`

- Unique code
- Human-readable name
- Enabled/disabled state
- Default ordering for presentation

### `Tour`

- Unique identifier
- Shared metadata such as slug, category, cover media reference, and status
- Price
- Rating as a decimal value from 1.0 to 5.0
- Number of reviews
- Tour type such as private, group, or tip-based
- Cancellation type such as 12h, 24h, 48h, or 72h free cancellation
- Duration in minutes
- Starting point as a structured location
- End point as a structured location
- Itinerary definition
- JSON Schema definition for localized content
- Stable tag keys that are independent from locale
- Draft/published state
- Audit fields for created/updated/published by and timestamps

### `TourTranslation`

- Tour reference
- Language reference
- Translation status metadata
- Localized payload data that must conform to the tour's JSON Schema
- Localized itinerary description when the itinerary is descriptive
- Localized stop titles keyed to the shared stop chain when the itinerary is stop-based

### `TourItineraryStop`

- Stable stop identity within the tour itinerary
- Required localized title resolved through translations
- Optional duration in minutes
- Optional coordinates
- Optional link to the next connection

### `TourItineraryConnection`

- Reference to the next stop
- Optional duration in minutes
- `commuteMode` with the values `walk`, `bike`, `bus`, `train`, `metro`, `tram`, `ferry`, `privateTransport`, `boat`, or `other`

### `BlogPost`

- Unique identifier
- Shared metadata such as slug, hero media reference, tags/categories, and status
- Draft/published state
- Audit fields for created/updated/published by and timestamps

### `BlogPostTranslation`

- Blog post reference
- Language reference
- Localized title
- Localized summary and body content
- Localized SEO fields if required by frontend consumers
- Translation status metadata

### `NewsletterSubscriber`

- Unique identifier
- Email
- Subscription status
- Optional preferred locale
- Consent timestamp
- Unsubscribe timestamp
- Source metadata if available

## API Requirements

Exact route names, DTO shapes, and module boundaries are implementation details. The backend must still provide the following resource capabilities.

### Admin APIs

- Auth endpoints or equivalent flows for login, logout, and password bootstrap/reset.
- CRUD-style endpoints for tours.
- CRUD-style endpoints for blog posts.
- Publish and unpublish operations for tours and blog posts.
- List and detail endpoints that expose translation availability for each content entry.
- Tour admin responses must include the tour schema and per-locale completeness or validation state against that schema.
- Tour admin responses must include the shared tour properties and itinerary variant.
- For stop-based itineraries, tour admin responses must distinguish between the shared stop chain and the localized stop titles.
- Tour admin responses must expose stable tag keys and localized tag labels separately.
- Language configuration endpoints or settings operations for enabling and disabling languages.
- Subscriber list, detail, search, and export operations for newsletter management.
- Admin user and role management capabilities for `super_admin`.

### Public APIs

- Read endpoints for published tours.
- Read endpoints for published blog posts.
- Locale-aware filtering or retrieval for public content.
- Public tour responses must include shared tour properties and itinerary data for published tours.
- Newsletter subscription endpoint.
- Newsletter unsubscription endpoint.

### API Visibility Rules

- Draft content must never appear in public APIs.
- Unpublished content must never appear in public APIs.
- Public content responses must only return localized fields for existing translations.
- Public tour responses must only return locales whose payload satisfies the tour schema.
- Public tour responses for descriptive itineraries must only return itinerary text for locales that satisfy the tour schema.
- Public tour responses for stop-based itineraries must only return localized stop titles for locales that satisfy the tour schema.
- Public tour responses must expose tags as stable keys with locale-appropriate labels.
- Admin APIs must include sufficient metadata to show missing translations and publication state.

## Localization Requirements

- The system must treat localization as a first-class concern across tours and blog posts.
- A content entry does not need to be fully translated into every enabled language before publishing.
- Missing translations must be visible to admins.
- Public clients must be able to request content by locale.
- For tours, localized content requirements must be defined by a JSON Schema stored on the tour itself.
- For tours, translations must provide a localized payload that fulfills the tour schema rather than relying on a fixed set of hardcoded localized fields.
- For tours, shared operational properties such as price, rating, reviews, type, cancellation type, duration, starting point, end point, and stop connectivity must remain outside the translation payload.
- For tours with descriptive itineraries, the itinerary description is localized content governed by the tour schema.
- For tours with stop-based itineraries, stop titles are localized content governed by the tour schema, while stop identity and connection data remain shared tour-level data.
- For tours, tags are an explicit exception to the schema-driven translation payload: tag keys belong to the tour and remain stable across languages, while tag labels may be translated per locale.
- If a requested locale is missing for a published item, the API behavior must be explicitly defined during implementation. Recommended default: return only items with an available translation for the requested locale rather than silently falling back.
- Supported languages at launch are English, Spanish, and Italian.
- Admin-configurable enabled languages must allow future expansion without requiring a schema redesign.

## Non-Functional Requirements

### Security

- Admin APIs must require authentication.
- Authorization must be enforced consistently across admin operations.
- Sensitive credentials and tokens must be handled securely.
- Newsletter subscription endpoints must validate input and defend against abuse at the application boundary.

### Auditability

- Admin changes to tours, blog posts, languages, and subscriber status should be auditable.
- Publication actions should store who performed them and when.

### Validation

- APIs must validate required fields, locale identifiers, role constraints, and publication state transitions.
- Tour translation validation must enforce conformance between the localized payload and the tour-defined JSON Schema before a locale is exposed publicly.
- Tour validation must enforce rating range, review count, itinerary variant rules, linked-list integrity for stop-based itineraries, and the allowed enums for tour type, cancellation type, and itinerary connection commute mode.
- Stop-based itinerary validation must enforce that each stop has a localized title, while duration and coordinates remain optional.
- Newsletter subscriptions must validate email format and subscription status transitions.

### Performance and Operability

- Admin list endpoints should support pagination and filtering.
- Public content endpoints should be designed for efficient read access.
- The architecture should permit future provider changes for auth, storage, and email with minimal domain-level disruption.
- Development media storage should use the local filesystem through an application-level storage abstraction.
- Production media storage should use Supabase Storage through the same application-level storage abstraction.

## Acceptance Criteria

The MVP requirements are met when the backend supports the following outcomes:

- An admin user can authenticate and access only the operations allowed by their role.
- An admin user can authenticate through Auth0 and be mapped to the correct local role.
- A `super_admin` can manage admin users, roles, and enabled languages.
- An `editor` can create, edit, publish, and unpublish tours and blog posts.
- A `marketing` user can access newsletter subscriber management without full admin privileges.
- A tour can define its localized content requirements through a JSON Schema and can be created in English and later translated into Spanish and Italian.
- A published tour or blog post can exist with incomplete translations.
- A tour can expose shared properties such as price, rating, reviews, type, cancellation type, duration, start point, end point, and itinerary independently of translations.
- A tour locale is only exposed publicly when its translation payload satisfies the tour schema.
- A tour can use a descriptive itinerary with localized itinerary text.
- A tour can use a stop-based itinerary with linked stops, optional stop and connection durations, optional coordinates, and localized stop titles.
- Tour tags remain stable across locales while their display values can be translated.
- Public APIs return only published content.
- Public APIs can serve content by locale when a translation exists and meets the availability rules for that content type.
- Media storage can use the same application-level storage abstraction in development with the local filesystem and in production with Supabase Storage.
- Newsletter subscribers can subscribe and unsubscribe through public endpoints.
- Future email-sending capabilities can target Resend without changing newsletter subscriber persistence in PostgreSQL.
- Duplicate subscription attempts are handled consistently without corrupting subscriber state.
- Newsletter subscription records retain consent and unsubscribe timestamps.

## Open Decisions and Defaults

### Defaults Chosen by This Spec

- Backend stack: NestJS on Node.js with PostgreSQL.
- Authentication provider: Auth0 for admin authentication.
- Initial supported languages: English, Spanish, Italian.
- Publishing workflow: draft and published only.
- Roles: `super_admin`, `editor`, `marketing`.
- Public content model: expose published tours and blog posts via public read APIs.
- Development storage: local filesystem via storage abstraction.
- Production storage: Supabase Storage via storage abstraction.
- Email provider: Resend.
- Newsletter scope: subscriber lifecycle only, not campaign management.

### Decisions Deferred to Implementation

- Final route names and DTO shapes.
- Exact database schema and table design.
- Exact JSON Schema subset supported in v1 for tour-defined localized payloads.
- Exact storage and response shape for localized tag labels.
- Exact currency representation for price.
- Exact location object shape for starting point and end point.
- Exact local filesystem storage path and layout for development.
- Exact Supabase Storage bucket structure and access patterns for production.
- Exact Auth0 integration shape, including token/session handling and identity-to-admin-user mapping details.
- Exact Resend integration shape, including sending triggers, template strategy, and webhook handling.
- Exact behavior when a requested locale is missing, if product requirements later prefer a fallback strategy.
