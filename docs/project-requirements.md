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
- The pricing model for paid tours must use a single amount plus currency.
- `tip_based` tours must be treated as no-fixed-price tours, where payment depends on the tourist's discretion rather than a stored fixed amount.
- Rating and number of reviews must be admin-managed values in v1.
- Tour content must support draft and published states.
- Publishing must be a manual action.
- A tour may be published even if only a subset of enabled languages is available.
- A published tour may also be temporarily hidden from all public APIs when it is momentarily unavailable.
- The admin interface contract should expose which languages are available for a tour and which are missing.
- The tour-defined JSON Schema must be the source of truth for which localized fields exist, their types, and which of them are required.
- A tour translation must support `draft` and `ready` states.
- A tour translation must support an explicit locale publication state with `published` and `unpublished`.
- A tour translation may also be temporarily hidden from public APIs when that tour is momentarily unavailable in a specific language.
- A tour translation may exist in an incomplete state, but a locale must be `ready`, `published`, not hidden, and satisfy all required fields in the tour schema before it is treated as available for public APIs.
- Every tour must include an itinerary.
- A tour itinerary must support either a localized descriptive itinerary or a stop-based itinerary represented as an ordered list of stops.
- For stop-based itineraries, the next physical stop in the itinerary is determined by the next entry in the ordered list.
- For stop-based itineraries, each stop may include an optional `nextConnection` that describes the segment to the following stop in the ordered list.
- For stop-based itineraries, stop order and connection data are shared tour-level data, while each stop title is localized through the translation payload.
- Tours must define stable tag keys independently of translations.
- Tag labels must be resolved through a global admin-managed tag dictionary with per-locale labels.
- Public APIs must return only published tours.
- Public APIs must support locale-aware responses for tour content.

### 4. Blog Post Management

- Admin users with the correct permissions must be able to create, edit, publish, unpublish, list, and view blog posts.
- A blog post must support shared metadata and language-specific translated HTML content.
- Blog post translations may reference stored images.
- No JSON content structure is defined for blog posts in v1.
- Blog posts must support draft and published states.
- Publishing must be a manual action.
- A blog post may be published with incomplete translations.
- A blog post translation must support its own `published` and `unpublished` state independently from the blog post.
- Public APIs must return only published blog posts.
- Public APIs must support locale-aware responses for blog content.

### 5. Newsletter Subscriber Management

- Public users must be able to subscribe to the newsletter.
- Newsletter subscriptions must use a double opt-in flow.
- The system must send a confirmation email to the subscriber and require confirmation before the subscription becomes active.
- Public users must be able to unsubscribe from the newsletter.
- The system must provide token-based unsubscribe links so a subscriber can unsubscribe directly from an email link.
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
- Temporary visibility control for hiding a published tour from public APIs
- Price amount for paid tours
- Currency for paid tours
- Rating as a decimal value from 1.0 to 5.0
- Number of reviews as an admin-managed count
- Tour type such as private, group, or tip-based
- Cancellation type such as 12h, 24h, 48h, or 72h free cancellation
- Duration in minutes
- Starting point coordinates
- End point coordinates
- Itinerary definition
- JSON Schema definition for localized content
- Stable tag keys that are independent from locale
- Draft/published state
- Audit fields for created/updated/published by and timestamps

### `Tag`

- Stable tag key
- Per-locale label values
- Admin-managed dictionary entry

### `TourTranslation`

- Tour reference
- Language reference
- Translation status metadata with `draft` and `ready`
- Translation publication state with `published` and `unpublished`
- Translation-level hidden flag for temporary locale unavailability
- Localized payload data that must conform to the tour's JSON Schema
- Localized starting point display label
- Localized end point display label
- Localized itinerary description when the itinerary is descriptive
- Localized stop titles keyed to the shared ordered stop list when the itinerary is stop-based

### `TourItineraryStop`

- Stable stop identity within the tour itinerary
- Required localized title resolved through translations
- Optional duration in minutes
- Optional coordinates
- Optional `nextConnection` describing the segment to the next stop in the ordered list

### `TourItineraryConnection`

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
- Translation publication state with `published` and `unpublished`
- Localized title
- Localized summary and HTML body content
- Localized SEO fields if required by frontend consumers
- Stored image references as needed by the HTML content
- Translation status metadata

### `NewsletterSubscriber`

- Unique identifier
- Email
- Subscription status
- Pending confirmation state before activation
- Optional preferred locale
- Consent timestamp
- Confirmation timestamp
- Unsubscribe timestamp
- Confirmation token or equivalent confirmation reference
- Unsubscribe token or equivalent unsubscribe reference
- Source metadata if available

## API Requirements

Exact route names, DTO shapes, and module boundaries are implementation details. The backend must still provide the following resource capabilities.

### Admin APIs

- Auth endpoints or equivalent flows for login, logout, and password bootstrap/reset.
- CRUD-style endpoints for tours.
- CRUD-style endpoints for blog posts.
- Publish and unpublish operations for tours and blog posts.
- Tour admin APIs must support publishing and unpublishing locales independently from publishing and unpublishing the tour.
- Blog admin APIs must support publishing and unpublishing blog translations independently from publishing and unpublishing the blog post.
- List and detail endpoints that expose translation availability for each content entry.
- Tour admin responses must include the tour schema and per-locale completeness or validation state against that schema.
- Tour admin responses must include the shared tour properties and itinerary variant.
- Tour admin responses must expose publication state, temporary visibility state, per-locale translation status, per-locale publication state, and per-locale hidden state separately.
- For stop-based itineraries, tour admin responses must distinguish between the shared ordered stop list and the localized stop titles.
- Tour admin responses must expose stable tag keys and resolved localized tag labels separately.
- Admin users with the correct permissions must be able to manage the global tag dictionary and its per-locale labels.
- Language configuration endpoints or settings operations for enabling and disabling languages.
- Subscriber list, detail, search, and export operations for newsletter management.
- Admin user and role management capabilities for `super_admin`.

### Public APIs

- Read endpoints for published tours.
- Read endpoints for published blog posts.
- Locale-aware filtering or retrieval for public content.
- Public tour responses must include shared tour properties and itinerary data for published tours.
- Public blog responses must include only published blog translations for the requested locale.
- Newsletter subscription endpoint.
- Newsletter confirmation endpoint or equivalent confirmation flow.
- Newsletter unsubscription endpoint.

### API Visibility Rules

- Draft content must never appear in public APIs.
- Unpublished content must never appear in public APIs.
- Temporarily hidden tours must never appear in public APIs.
- Unpublished translations must never appear in public APIs for their locale.
- Hidden translations must never appear in public APIs for their locale.
- Public content responses must only return localized fields for existing translations.
- Public tour responses must only return locales whose translation status is `ready`, whose translation is `published`, whose translation is not hidden, and whose payload satisfies the tour schema.
- Public APIs must not fall back to another locale when the requested locale is missing or not publicly available.
- Public blog responses must only return locales whose blog translation is `published`.
- Public tour responses for descriptive itineraries must only return itinerary text for locales that satisfy the tour schema.
- Public tour responses for stop-based itineraries must only return localized stop titles for locales that satisfy the tour schema.
- Public tour responses must expose tags as stable keys with locale-appropriate labels resolved from the global tag dictionary.
- Admin APIs must include sufficient metadata to show missing translations and publication state.

## Localization Requirements

- The system must treat localization as a first-class concern across tours and blog posts.
- A content entry does not need to be fully translated into every enabled language before publishing.
- Missing translations must be visible to admins.
- Public clients must be able to request content by locale.
- For tours, localized content requirements must be defined by a JSON Schema stored on the tour itself.
- For tours, translations must provide a localized payload that fulfills the tour schema rather than relying on a fixed set of hardcoded localized fields.
- For tours, shared operational properties such as price, rating, reviews, type, cancellation type, duration, start and end point coordinates, and stop connectivity must remain outside the translation payload.
- For tours, start and end point display labels are localized content governed by the translation payload.
- For tours with descriptive itineraries, the itinerary description is localized content governed by the tour schema.
- For tours with stop-based itineraries, stop titles are localized content governed by the tour schema, while stop order and connection data remain shared tour-level data.
- For tours, translation readiness must be tracked separately from tour publication, separately from translation-level publication, separately from tour-level temporary visibility, and separately from translation-level temporary visibility.
- For tours, tags are an explicit exception to the schema-driven translation payload: tag keys belong to the tour and remain stable across languages, while tag labels are resolved from a global tag dictionary with per-locale labels.
- For tours, if a requested locale is missing or incomplete, the public API must not silently fall back to another locale.
- For blog posts, localized content remains HTML-based rather than schema-driven.
- For blog posts, blog-level publication and translation-level publication must both be satisfied before a locale is public.
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
- Admin changes to tour rating and review count should be auditable.
- Publication actions should store who performed them and when.

### Validation

- APIs must validate required fields, locale identifiers, role constraints, and publication state transitions.
- Tour translation validation must enforce conformance between the localized payload and the tour-defined JSON Schema before a locale is exposed publicly.
- Tour publication validation must require the tour to be published, not temporarily hidden, and the locale to be `ready`, `published`, not hidden, with all schema-required localized fields present and valid before that locale is publicly available.
- Locale publish operations must be rejected when required localized fields are missing or invalid.
- Tour pricing validation must require a single amount and currency for paid tours, and must require `tip_based` tours to omit a fixed price amount.
- Optional tour fields do not block publication when omitted, but if they are provided the backend must validate their declared type and shape.
- Tour validation must enforce rating range, review count, itinerary variant rules, ordered single-path integrity for stop-based itineraries, and the allowed enums for tour type, cancellation type, and itinerary connection commute mode.
- Stop-based itinerary validation must enforce that each stop has a localized title, while duration and coordinates remain optional.
- Newsletter subscriptions must validate email format, confirmation and unsubscribe tokens, and double opt-in subscription status transitions.

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
- A paid tour can define a single fixed amount and currency, while a `tip_based` tour can be created without a fixed price amount.
- A tour rating and review count can be managed by admins without requiring an external reviews integration.
- A tour locale is only exposed publicly when its translation is `ready`, `published`, not hidden, and its payload satisfies the tour schema.
- Public APIs do not fall back to another locale when the requested locale is unavailable.
- Missing optional localized fields do not block publication, but provided optional fields are still backend-validated.
- A published tour can be temporarily hidden from all public APIs without being unpublished.
- A translation can be `ready` and still be hidden from all public APIs for its locale.
- A tour can be published while some locales remain unpublished.
- A tour can use a descriptive itinerary with localized itinerary text.
- A tour can use a stop-based itinerary with an ordered stop list, optional stop and connection durations, optional coordinates, and localized stop titles.
- A blog post can be authored as localized HTML content with references to stored images.
- A blog post can be published while some blog translations remain unpublished.
- Tour tags remain stable across locales while their display values can be translated.
- Public APIs return only published content.
- Public APIs can serve content by locale when a translation exists and meets the availability rules for that content type.
- Media storage can use the same application-level storage abstraction in development with the local filesystem and in production with Supabase Storage.
- Newsletter subscribers can subscribe through a double opt-in flow and confirm by email before activation.
- Newsletter subscribers can unsubscribe through a tokenized email link.
- Future email-sending capabilities can target Resend without changing newsletter subscriber persistence in PostgreSQL.
- Duplicate subscription attempts are handled consistently without corrupting subscriber state.
- Newsletter subscription records retain consent and unsubscribe timestamps.

## Open Decisions and Defaults

### Defaults Chosen by This Spec

- Backend stack: NestJS on Node.js with PostgreSQL.
- Authentication provider: Auth0 for admin authentication.
- Initial supported languages: English, Spanish, Italian.
- Publishing workflow: draft and published only.
- Translation readiness workflow: `draft` and `ready`.
- Pricing model: single amount plus currency for paid tours; no fixed amount for `tip_based` tours.
- Rating and review ownership: admin-managed.
- Point structure: shared coordinates plus localized display label.
- Tag labels: global tag dictionary with per-locale labels.
- Roles: `super_admin`, `editor`, `marketing`.
- Public content model: expose published tours and blog posts via public read APIs.
- Development storage: local filesystem via storage abstraction.
- Production storage: Supabase Storage via storage abstraction.
- Email provider: Resend.
- Newsletter scope: subscriber lifecycle with double opt-in and tokenized unsubscribe, not campaign management.

### Decisions Deferred to Implementation

- Final route names and DTO shapes.
- Exact database schema and table design.
- Exact JSON Schema subset supported in v1 for tour-defined localized payloads.
- Exact storage and response shape for localized tag labels.
- Exact currency representation for paid tours.
- Exact location object shape for starting point and end point.
- Exact local filesystem storage path and layout for development.
- Exact Supabase Storage bucket structure and access patterns for production.
- Exact Auth0 integration shape, including token/session handling and identity-to-admin-user mapping details.
- Exact Resend integration shape, including sending triggers, template strategy, and webhook handling.

## Open Topics and Clarifications Needed

This section captures areas where the current requirements are either still open, not fully specified, or likely to produce different implementations unless clarified.

### 1. Tour Schema Policy

Tours define a JSON Schema for localized content, but the supported subset and constraints are not yet defined.

#### Option 1: Minimal JSON Schema subset for v1

Pros:

- Easier to validate, document, and support in admin tooling.
- Lowers implementation complexity for the MVP.

Cons:

- May be too restrictive for future content needs.
- Could require a schema migration path later.

#### Option 2: Broad JSON Schema support

Pros:

- More flexible and future-proof.
- Closer to standard JSON Schema behavior.

Cons:

- Harder to validate consistently across admin and public flows.
- More complex to support in forms and editorial tooling.

#### Option 3: Custom constrained schema model inspired by JSON Schema

Pros:

- Lets the product define only the needed features.
- Easier to tailor to CMS editing experience.

Cons:

- Diverges from standard JSON Schema expectations.
- Requires extra documentation and mapping rules.
