import { ApiProperty, ApiPropertyOptional, getSchemaPath } from '@nestjs/swagger';

import {
  ADMIN_ROLES,
  ADMIN_USER_STATUSES,
  NEWSLETTER_SUBSCRIPTION_STATUSES,
  SUPPORTED_LANGUAGE_CODES,
  TOUR_COMMUTE_MODES,
  TOUR_TYPES,
} from '../shared/domain';

export class ErrorResponseDto {
  @ApiProperty({
    description: 'HTTP status code returned by NestJS for the failed request.',
    example: 400,
  })
  statusCode!: number;

  @ApiProperty({
    description: 'Validation or domain error details. NestJS may return a string or a list of strings.',
    oneOf: [
      { type: 'string', example: 'Validation failed' },
      {
        type: 'array',
        items: { type: 'string' },
        example: ['slug must match /^[a-z0-9]+(?:-[a-z0-9]+)*$/'],
      },
    ],
  })
  message!: string | string[];

  @ApiProperty({
    description: 'NestJS exception name.',
    example: 'Bad Request',
  })
  error!: string;
}

export class AuditMetadataDto {
  @ApiPropertyOptional({
    description: 'UUID of the admin that originally created the record.',
    format: 'uuid',
    nullable: true,
  })
  createdBy!: string | null;

  @ApiPropertyOptional({
    description: 'UUID of the admin that most recently updated the record.',
    format: 'uuid',
    nullable: true,
  })
  updatedBy!: string | null;

  @ApiPropertyOptional({
    description: 'UUID of the admin that published the record, if it is currently published.',
    format: 'uuid',
    nullable: true,
  })
  publishedBy!: string | null;

  @ApiProperty({
    description: 'Creation timestamp.',
    type: String,
    format: 'date-time',
  })
  createdAt!: string;

  @ApiProperty({
    description: 'Last update timestamp.',
    type: String,
    format: 'date-time',
  })
  updatedAt!: string;

  @ApiPropertyOptional({
    description: 'Publication timestamp, or `null` when the record is not currently published.',
    type: String,
    format: 'date-time',
    nullable: true,
  })
  publishedAt!: string | null;
}

export class RecordAuditMetadataDto {
  @ApiPropertyOptional({
    description: 'UUID of the admin that originally created the record.',
    format: 'uuid',
    nullable: true,
  })
  createdBy!: string | null;

  @ApiPropertyOptional({
    description: 'UUID of the admin that most recently updated the record.',
    format: 'uuid',
    nullable: true,
  })
  updatedBy!: string | null;

  @ApiProperty({
    description: 'Creation timestamp.',
    type: String,
    format: 'date-time',
  })
  createdAt!: string;

  @ApiProperty({
    description: 'Last update timestamp.',
    type: String,
    format: 'date-time',
  })
  updatedAt!: string;
}

export class PublishedRecordAuditMetadataDto extends RecordAuditMetadataDto {
  @ApiPropertyOptional({
    description:
      'Latest successful translation publication timestamp, or `null` when the record has no published translations.',
    type: String,
    format: 'date-time',
    nullable: true,
  })
  publishedAt!: string | null;
}

export class HealthFoundationDto {
  @ApiProperty({
    description: 'Configured admin roles available in the platform.',
    enum: ADMIN_ROLES,
    isArray: true,
  })
  adminRoles!: (typeof ADMIN_ROLES)[number][];

  @ApiProperty({
    description: 'Supported language codes defined in the shared domain vocabulary.',
    enum: SUPPORTED_LANGUAGE_CODES,
    isArray: true,
  })
  supportedLanguageCodes!: (typeof SUPPORTED_LANGUAGE_CODES)[number][];

  @ApiProperty({
    description: 'Supported tour commercial models.',
    enum: TOUR_TYPES,
    isArray: true,
  })
  tourTypes!: (typeof TOUR_TYPES)[number][];

  @ApiProperty({
    description: 'Supported commute modes between itinerary stops.',
    enum: TOUR_COMMUTE_MODES,
    isArray: true,
  })
  tourCommuteModes!: (typeof TOUR_COMMUTE_MODES)[number][];

  @ApiProperty({
    description: 'Newsletter subscription lifecycle states reserved by the domain model.',
    enum: NEWSLETTER_SUBSCRIPTION_STATUSES,
    isArray: true,
  })
  newsletterSubscriptionStatuses!: (typeof NEWSLETTER_SUBSCRIPTION_STATUSES)[number][];
}

export class HealthResponseDto {
  @ApiProperty({
    description: 'Service health status.',
    example: 'ok',
  })
  status!: string;

  @ApiProperty({
    description: 'Configured application name.',
    example: 'walk-and-tour-backend',
  })
  app!: string;

  @ApiProperty({
    description: 'Current runtime environment.',
    example: 'development',
  })
  environment!: string;

  @ApiProperty({
    description: 'Shared domain constants exported by the backend foundation layer.',
    type: () => HealthFoundationDto,
  })
  foundation!: HealthFoundationDto;
}

export class LanguageResponseDto {
  @ApiProperty({
    description: 'Locale code used throughout the API and translation tables.',
    example: 'en',
  })
  code!: string;

  @ApiProperty({
    description: 'Human-readable language name.',
    example: 'English',
  })
  name!: string;

  @ApiProperty({
    description: 'Whether the locale is enabled for public content APIs.',
    example: true,
  })
  isEnabled!: boolean;

  @ApiProperty({
    description: 'Ordering index used when listing languages.',
    example: 1,
  })
  sortOrder!: number;

  @ApiProperty({
    description: 'Creation timestamp.',
    type: String,
    format: 'date-time',
  })
  createdAt!: string;

  @ApiProperty({
    description: 'Last update timestamp.',
    type: String,
    format: 'date-time',
  })
  updatedAt!: string;
}

export class TagResponseDto {
  @ApiProperty({
    description: 'Stable internal tag key.',
    example: 'history',
  })
  key!: string;

  @ApiProperty({
    description: 'Localized labels keyed by locale code.',
    type: 'object',
    additionalProperties: { type: 'string' },
    example: {
      en: 'History',
      es: 'Historia',
    },
  })
  labels!: Record<string, string>;

  @ApiProperty({
    description: 'Creation timestamp.',
    type: String,
    format: 'date-time',
  })
  createdAt!: string;

  @ApiProperty({
    description: 'Last update timestamp.',
    type: String,
    format: 'date-time',
  })
  updatedAt!: string;
}

export class PublicTagResponseDto {
  @ApiProperty({
    description: 'Stable internal tag key.',
    example: 'history',
  })
  key!: string;

  @ApiPropertyOptional({
    description: 'Localized tag label for the requested locale, or `null` if the label is missing.',
    example: 'History',
    nullable: true,
  })
  label!: string | null;
}

export class RoleResponseDto {
  @ApiProperty({
    description: 'Stable role name used by route guards.',
    enum: ADMIN_ROLES,
    example: 'super_admin',
  })
  name!: (typeof ADMIN_ROLES)[number];

  @ApiProperty({
    description: 'Human-readable explanation of the role.',
    example: 'Full administrative access to backoffice management endpoints.',
  })
  description!: string;

  @ApiProperty({
    description: 'Permission identifiers attached to the role record.',
    type: [String],
    example: ['admin.users.manage', 'content.publish'],
  })
  permissions!: string[];

  @ApiProperty({
    description: 'Creation timestamp.',
    type: String,
    format: 'date-time',
  })
  createdAt!: string;

  @ApiProperty({
    description: 'Last update timestamp.',
    type: String,
    format: 'date-time',
  })
  updatedAt!: string;
}

export class AdminUserResponseDto {
  @ApiProperty({
    description: 'Admin user UUID.',
    format: 'uuid',
  })
  id!: string;

  @ApiPropertyOptional({
    description: 'Mapped Auth0 subject, if already linked.',
    example: 'auth0|abc123',
    nullable: true,
  })
  auth0UserId!: string | null;

  @ApiProperty({
    description: 'Normalized admin email address.',
    example: 'admin@example.com',
  })
  email!: string;

  @ApiProperty({
    description: 'Assigned role name.',
    enum: ADMIN_ROLES,
  })
  roleName!: (typeof ADMIN_ROLES)[number];

  @ApiProperty({
    description: 'Expanded role record.',
    type: () => RoleResponseDto,
  })
  role!: RoleResponseDto;

  @ApiProperty({
    description: 'Lifecycle state of the admin user.',
    enum: ADMIN_USER_STATUSES,
  })
  status!: (typeof ADMIN_USER_STATUSES)[number];

  @ApiProperty({
    description: 'Creation timestamp.',
    type: String,
    format: 'date-time',
  })
  createdAt!: string;

  @ApiProperty({
    description: 'Last update timestamp.',
    type: String,
    format: 'date-time',
  })
  updatedAt!: string;

  @ApiPropertyOptional({
    description: 'Last successful authenticated login timestamp.',
    type: String,
    format: 'date-time',
    nullable: true,
  })
  lastLoginAt!: string | null;
}

export class AuthenticatedAdminResponseDto {
  @ApiProperty({
    description: 'Local admin UUID.',
    format: 'uuid',
  })
  id!: string;

  @ApiProperty({
    description: 'Authenticated admin email.',
    example: 'editor@example.com',
  })
  email!: string;

  @ApiProperty({
    description: 'Resolved local role of the authenticated admin.',
    enum: ADMIN_ROLES,
  })
  roleName!: (typeof ADMIN_ROLES)[number];

  @ApiProperty({
    description: 'Lifecycle status of the authenticated admin.',
    enum: ADMIN_USER_STATUSES,
  })
  status!: (typeof ADMIN_USER_STATUSES)[number];

  @ApiProperty({
    description: 'Bearer token subject issued by Auth0.',
    example: 'auth0|abc123',
  })
  auth0UserId!: string;
}

export class LogoutResponseDto {
  @ApiProperty({
    description: 'Logout strategy expected by the frontend. Tokens are bearer tokens and must be discarded client-side.',
    example: 'client_discard_bearer_token',
  })
  logoutStrategy!: string;
}

export class GeoCoordinatesDto {
  @ApiProperty({
    description: 'Latitude in decimal degrees.',
    example: 41.3874,
  })
  lat!: number;

  @ApiProperty({
    description: 'Longitude in decimal degrees.',
    example: 2.1686,
  })
  lng!: number;
}

export class SharedPointResponseDto {
  @ApiPropertyOptional({
    description: 'Coordinates shared across all locales for the point.',
    type: () => GeoCoordinatesDto,
  })
  coordinates?: GeoCoordinatesDto;
}

export class PublicPointResponseDto {
  @ApiProperty({
    description: 'Shared point metadata defined at the tour level.',
    type: () => SharedPointResponseDto,
  })
  shared!: SharedPointResponseDto;

  @ApiPropertyOptional({
    description: 'Localized point metadata from the selected translation payload.',
    type: 'object',
    additionalProperties: true,
    nullable: true,
    example: { label: 'Town Hall' },
  })
  localized!: Record<string, unknown> | null;
}

export class MediaAssetResponseDto {
  @ApiProperty({
    description: 'Media asset UUID.',
    format: 'uuid',
  })
  id!: string;

  @ApiProperty({
    description: 'Stored media type.',
    enum: ['image', 'video'],
    example: 'image',
  })
  mediaType!: 'image' | 'video';

  @ApiProperty({
    description: 'Media storage path.',
    example: 'media/tours/historic-center/cover.jpg',
  })
  storagePath!: string;

  @ApiProperty({
    description: 'API URL used to fetch the stored media bytes.',
    example: 'http://api.dev.walkandtour.dk:3000/api/admin/media/uuid/content',
  })
  contentUrl!: string;

  @ApiProperty({
    description: 'Detected content type of the uploaded object.',
    example: 'image/jpeg',
  })
  contentType!: string;

  @ApiProperty({
    description: 'Stored file size in bytes.',
    example: 248193,
  })
  size!: number;

  @ApiProperty({
    description: 'Original uploaded filename.',
    example: 'cover.jpg',
  })
  originalFilename!: string;
}

export class AdminMediaAssetBaseResponseDto {
  @ApiProperty({
    description: 'Media asset UUID.',
    format: 'uuid',
  })
  id!: string;

  @ApiProperty({
    description: 'Stored media type.',
    enum: ['image', 'video'],
    example: 'image',
  })
  mediaType!: 'image' | 'video';

  @ApiProperty({
    description: 'Media storage path.',
    example: 'media/tours/historic-center/cover.jpg',
  })
  storagePath!: string;

  @ApiProperty({
    description: 'Authenticated admin API URL used to fetch the stored media bytes.',
    example: 'http://api.dev.walkandtour.dk:3000/api/admin/media/uuid/content',
  })
  adminContentUrl!: string;

  @ApiProperty({
    description: 'Public API URL used to fetch the stored media bytes without admin authentication.',
    example: 'http://api.dev.walkandtour.dk:3000/api/media/uuid/content',
  })
  publicContentUrl!: string;

  @ApiProperty({
    description: 'Detected content type of the uploaded object.',
    example: 'image/jpeg',
  })
  contentType!: string;

  @ApiProperty({
    description: 'Stored file size in bytes.',
    example: 248193,
  })
  size!: number;

  @ApiProperty({
    description: 'Original uploaded filename.',
    example: 'cover.jpg',
  })
  originalFilename!: string;
}

export class UploadedMediaResponseDto extends AdminMediaAssetBaseResponseDto {}

export class AdminMediaAssetResponseDto extends AdminMediaAssetBaseResponseDto {
  @ApiProperty({
    description: 'Creation timestamp of the media asset record.',
    type: String,
    format: 'date-time',
  })
  createdAt!: string;

  @ApiProperty({
    description: 'Last update timestamp of the media asset record.',
    type: String,
    format: 'date-time',
  })
  updatedAt!: string;
}

export class AdminMediaAssetListResponseDto {
  @ApiProperty({
    description: 'Paginated media asset results.',
    type: () => [AdminMediaAssetResponseDto],
  })
  items!: AdminMediaAssetResponseDto[];

  @ApiProperty({
    description: 'Current page number.',
    example: 1,
  })
  page!: number;

  @ApiProperty({
    description: 'Current page size.',
    example: 20,
  })
  limit!: number;

  @ApiProperty({
    description: 'Total matching media assets.',
    example: 42,
  })
  total!: number;
}

export class BlogMediaListResponseDto {
  @ApiProperty({
    description: 'Attached blog media assets.',
    type: () => [MediaAssetResponseDto],
  })
  items!: MediaAssetResponseDto[];
}

export class TourMediaItemResponseDto extends MediaAssetResponseDto {
  @ApiProperty({
    description: 'Attached media asset UUID.',
    format: 'uuid',
  })
  mediaId!: string;

  @ApiPropertyOptional({
    description: 'Optional localized alt text keyed by locale code for this tour usage.',
    type: 'object',
    additionalProperties: {
      type: 'string',
    },
    nullable: true,
    example: {
      en: 'View of the cathedral facade',
      es: 'Vista de la fachada de la catedral',
    },
  })
  altText!: Record<string, string> | null;

  @ApiProperty({
    description: 'Display order among the attached media items.',
    example: 0,
  })
  orderIndex!: number;
}

export class TourMediaListResponseDto {
  @ApiProperty({
    description: 'Attached tour media assets in display order.',
    type: () => [TourMediaItemResponseDto],
  })
  items!: TourMediaItemResponseDto[];
}

export class PriceResponseDto {
  @ApiProperty({
    description: 'Fixed price amount.',
    example: 25,
  })
  amount!: number;

  @ApiProperty({
    description: 'Currency code paired with the fixed price amount.',
    example: 'EUR',
  })
  currency!: string;
}

export class TourNextConnectionResponseDto {
  @ApiPropertyOptional({
    description: 'Travel time to the next stop in minutes.',
    example: 8,
    nullable: true,
  })
  durationMinutes!: number | null;

  @ApiProperty({
    description: 'Commute mode used between this stop and the next stop.',
    enum: TOUR_COMMUTE_MODES,
  })
  commuteMode!: (typeof TOUR_COMMUTE_MODES)[number];
}

export class TourAdminItineraryStopResponseDto {
  @ApiProperty({
    description: 'Stable stop identifier shared across translations.',
    example: 'stop-1',
  })
  id!: string;

  @ApiPropertyOptional({
    description: 'Planned stop duration in minutes.',
    example: 15,
    nullable: true,
  })
  durationMinutes!: number | null;

  @ApiPropertyOptional({
    description: 'Optional stop coordinates.',
    type: () => GeoCoordinatesDto,
    nullable: true,
  })
  coordinates!: GeoCoordinatesDto | null;

  @ApiPropertyOptional({
    description: 'Transport information to the next stop. The final stop must keep this field `null`.',
    type: () => TourNextConnectionResponseDto,
    nullable: true,
  })
  nextConnection!: TourNextConnectionResponseDto | null;
}

export class PublicTourStopResponseDto extends TourAdminItineraryStopResponseDto {
  @ApiPropertyOptional({
    description: 'Localized stop title from the selected translation.',
    example: 'City Hall',
    nullable: true,
  })
  title!: string | null;

  @ApiPropertyOptional({
    description: 'Localized stop description from the selected translation.',
    example: 'Meet at the main square.',
    nullable: true,
  })
  description!: string | null;
}

export class TourAdminItineraryResponseDto {
  @ApiProperty({
    description: 'Whether the itinerary is modeled as shared ordered stops or a free-form description.',
    enum: ['description', 'stops'],
    example: 'stops',
  })
  variant!: 'description' | 'stops';

  @ApiProperty({
    description: 'Ordered shared itinerary stops. Empty for `description` itineraries.',
    type: () => [TourAdminItineraryStopResponseDto],
  })
  stops!: TourAdminItineraryStopResponseDto[];
}

export class PublicTourItineraryResponseDto {
  @ApiProperty({
    description: 'Whether the itinerary is modeled as ordered localized stops or a localized description.',
    enum: ['description', 'stops'],
    example: 'description',
  })
  variant!: 'description' | 'stops';

  @ApiPropertyOptional({
    description: 'Ordered localized itinerary stops. Present for `stops` itineraries.',
    type: () => [PublicTourStopResponseDto],
  })
  stops?: PublicTourStopResponseDto[];

  @ApiPropertyOptional({
    description: 'Localized itinerary narrative. Present for `description` itineraries.',
    example: 'Walk through the old city and discover Roman, medieval, and modern landmarks.',
    nullable: true,
  })
  itineraryDescription?: string | null;
}

export class TourAdminTranslationResponseDto {
  @ApiProperty({
    description: 'Whether the translation currently satisfies all required completeness rules.',
    example: true,
  })
  isReady!: boolean;

  @ApiProperty({
    description: 'Whether the translation is configured to be publicly exposed.',
    example: true,
  })
  isPublished!: boolean;

  @ApiPropertyOptional({
    description: 'External booking reference for the locale, if any.',
    nullable: true,
    example: 'booking-ref-123',
  })
  bookingReferenceId!: string | null;

  @ApiPropertyOptional({
    description: 'Localized cancellation policy text, or `null` when the translation is incomplete.',
    example: 'Free cancellation up to 24 hours before the start time.',
    nullable: true,
  })
  cancellationType!: string | null;

  @ApiPropertyOptional({
    description: 'Localized highlight bullets in admin-defined order, or `null` when the translation is incomplete.',
    type: [String],
    example: ['Gothic Quarter landmarks', 'Roman walls'],
    nullable: true,
  })
  highlights!: string[] | null;

  @ApiPropertyOptional({
    description: 'Localized inclusions list in admin-defined order, or `null` when the translation is incomplete.',
    type: [String],
    example: ['Local guide', 'City map'],
    nullable: true,
  })
  included!: string[] | null;

  @ApiPropertyOptional({
    description: 'Localized exclusions list in admin-defined order, or `null` when the translation is incomplete.',
    type: [String],
    example: ['Hotel pickup', 'Food and drinks'],
    nullable: true,
  })
  notIncluded!: string[] | null;

  @ApiProperty({
    description: 'Localized payload validated against the shared content schema.',
    type: 'object',
    additionalProperties: true,
  })
  payload!: Record<string, unknown>;
}

export class TourTranslationAvailabilityResponseDto {
  @ApiProperty({
    description: 'Locale code being evaluated.',
    example: 'en',
  })
  languageCode!: string;

  @ApiProperty({
    description: 'Whether the translation currently satisfies all required completeness rules.',
    example: true,
  })
  isReady!: boolean;

  @ApiProperty({
    description: 'Whether the translation is configured to be publicly exposed.',
    example: true,
  })
  isPublished!: boolean;

  @ApiProperty({
    description: 'Required localized list fields that are missing or malformed.',
    type: [String],
    example: [],
  })
  missingRequiredLists!: string[];

  @ApiProperty({
    description: 'Shared stop identifiers that still lack localized title/description pairs.',
    type: [String],
    example: [],
  })
  missingStopTranslations!: string[];

  @ApiProperty({
    description: 'Whether the localized payload currently validates against the required schema.',
    example: true,
  })
  isSchemaValid!: boolean;

  @ApiProperty({
    description: 'Whether the translation is currently exposed by `public/tours` for its locale.',
    example: true,
  })
  publiclyAvailable!: boolean;
}

export class PublicTourTranslationResponseDto {
  @ApiProperty({
    description: 'Requested locale code.',
    example: 'en',
  })
  locale!: string;

  @ApiPropertyOptional({
    description: 'External booking reference associated with the published locale.',
    nullable: true,
  })
  bookingReferenceId!: string | null;

  @ApiProperty({
    description: 'Localized cancellation policy text.',
    example: 'Free cancellation up to 24 hours before the start time.',
  })
  cancellationType!: string;

  @ApiProperty({
    description: 'Localized highlight bullets in display order.',
    type: [String],
    example: ['Gothic Quarter landmarks', 'Roman walls'],
  })
  highlights!: string[];

  @ApiProperty({
    description: 'Localized inclusions list in display order.',
    type: [String],
    example: ['Local guide', 'City map'],
  })
  included!: string[];

  @ApiProperty({
    description: 'Localized exclusions list in display order.',
    type: [String],
    example: ['Hotel pickup', 'Food and drinks'],
  })
  notIncluded!: string[];

  @ApiProperty({
    description: 'Published localized payload for the requested locale.',
    type: 'object',
    additionalProperties: true,
  })
  payload!: Record<string, unknown>;
}

export class TourAdminResponseDto {
  @ApiProperty({
    description: 'Tour UUID.',
    format: 'uuid',
  })
  id!: string;

  @ApiProperty({
    description: 'Non-localized admin-facing name for the tour.',
    example: 'Barcelona Historic Center Main Tour',
  })
  name!: string;

  @ApiProperty({
    description:
      'Manual display position used by the default admin and public tour list ordering. Lower values appear first.',
    example: 0,
  })
  sortOrder!: number;

  @ApiProperty({
    description: 'Stable public slug.',
    example: 'historic-center',
  })
  slug!: string;

  @ApiPropertyOptional({
    description: 'Attached image asset UUID used as the tour cover.',
    format: 'uuid',
    nullable: true,
  })
  coverMediaId!: string | null;

  @ApiProperty({
    description: 'Ordered attached media items with per-tour localized alt text.',
    type: () => [TourMediaItemResponseDto],
  })
  mediaItems!: TourMediaItemResponseDto[];

  @ApiPropertyOptional({
    description: 'Shared JSON Schema that localized translation payloads must satisfy.',
    type: 'object',
    additionalProperties: true,
    nullable: true,
  })
  contentSchema!: Record<string, unknown> | null;

  @ApiPropertyOptional({
    description: 'Fixed price data. `null` for tip-based tours.',
    type: () => PriceResponseDto,
    nullable: true,
  })
  price!: PriceResponseDto | null;

  @ApiPropertyOptional({
    description: 'Average rating normalized to a numeric value.',
    example: 4.8,
    nullable: true,
  })
  rating!: number | null;

  @ApiPropertyOptional({
    description: 'Total review count.',
    example: 120,
    nullable: true,
  })
  reviewCount!: number | null;

  @ApiProperty({
    description: 'Tour commercial model.',
    enum: TOUR_TYPES,
  })
  tourType!: (typeof TOUR_TYPES)[number];

  @ApiPropertyOptional({
    description: 'Total duration in minutes.',
    example: 120,
    nullable: true,
  })
  durationMinutes!: number | null;

  @ApiPropertyOptional({
    description: 'Shared start point object.',
    type: () => SharedPointResponseDto,
    nullable: true,
  })
  startPoint!: SharedPointResponseDto | null;

  @ApiPropertyOptional({
    description: 'Shared end point object.',
    type: () => SharedPointResponseDto,
    nullable: true,
  })
  endPoint!: SharedPointResponseDto | null;

  @ApiPropertyOptional({
    description: 'Shared itinerary structure.',
    type: () => TourAdminItineraryResponseDto,
    nullable: true,
  })
  itinerary!: TourAdminItineraryResponseDto | null;

  @ApiProperty({
    description: 'Ordered tag keys assigned to the tour.',
    type: [String],
    example: ['history'],
  })
  tagKeys!: string[];

  @ApiProperty({
    description: 'Expanded tag records.',
    type: () => [TagResponseDto],
  })
  tags!: TagResponseDto[];

  @ApiProperty({
    description: 'Localized translation records keyed by locale code.',
    type: 'object',
    additionalProperties: { $ref: getSchemaPath(TourAdminTranslationResponseDto) },
  })
  translations!: Record<string, TourAdminTranslationResponseDto>;

  @ApiProperty({
    description: 'Per-locale publishability diagnostics derived from the shared schema and itinerary.',
    type: () => [TourTranslationAvailabilityResponseDto],
  })
  translationAvailability!: TourTranslationAvailabilityResponseDto[];

  @ApiProperty({
    description: 'Audit metadata for create and update operations.',
    type: () => RecordAuditMetadataDto,
  })
  audit!: RecordAuditMetadataDto;
}

export class PublicTourResponseDto {
  @ApiProperty({
    description: 'Tour UUID.',
    format: 'uuid',
  })
  id!: string;

  @ApiProperty({
    description: 'Stable public slug.',
    example: 'historic-center',
  })
  slug!: string;

  @ApiPropertyOptional({
    description: 'Optional cover media item selected from the attached assets.',
    type: () => TourMediaItemResponseDto,
    nullable: true,
  })
  coverMedia!: TourMediaItemResponseDto | null;

  @ApiProperty({
    description: 'Public gallery media items excluding the selected cover.',
    type: () => [TourMediaItemResponseDto],
  })
  galleryMedia!: TourMediaItemResponseDto[];

  @ApiPropertyOptional({
    description: 'Fixed price data. `null` for tip-based tours.',
    type: () => PriceResponseDto,
    nullable: true,
  })
  price!: PriceResponseDto | null;

  @ApiProperty({
    description: 'Average rating normalized to a numeric value.',
    example: 4.8,
  })
  rating!: number;

  @ApiProperty({
    description: 'Total review count.',
    example: 120,
  })
  reviewCount!: number;

  @ApiProperty({
    description: 'Tour commercial model.',
    enum: TOUR_TYPES,
  })
  tourType!: (typeof TOUR_TYPES)[number];

  @ApiProperty({
    description: 'Total duration in minutes.',
    example: 120,
  })
  durationMinutes!: number;

  @ApiProperty({
    description: 'Start point data split into shared and localized portions.',
    type: () => PublicPointResponseDto,
  })
  startPoint!: PublicPointResponseDto;

  @ApiProperty({
    description: 'End point data split into shared and localized portions.',
    type: () => PublicPointResponseDto,
  })
  endPoint!: PublicPointResponseDto;

  @ApiProperty({
    description: 'Localized tag labels for the requested locale.',
    type: () => [PublicTagResponseDto],
  })
  tags!: PublicTagResponseDto[];

  @ApiProperty({
    description: 'Published localized translation payload selected for the requested locale.',
    type: () => PublicTourTranslationResponseDto,
  })
  translation!: PublicTourTranslationResponseDto;

  @ApiProperty({
    description: 'Localized itinerary returned for the requested locale.',
    type: () => PublicTourItineraryResponseDto,
  })
  itinerary!: PublicTourItineraryResponseDto;

}

export class BlogAdminTranslationResponseDto {
  @ApiProperty({
    description: 'Whether the translation is published.',
    example: true,
  })
  isPublished!: boolean;

  @ApiProperty({
    description: 'Aggregated view count for this translation locale.',
    example: 128,
    minimum: 0,
  })
  viewCount!: number;

  @ApiProperty({
    description: 'Localized title.',
    example: 'Barcelona Historic Center Guide',
  })
  title!: string;

  @ApiPropertyOptional({
    description: 'Localized summary copy.',
    nullable: true,
  })
  summary!: string | null;

  @ApiProperty({
    description: 'Localized rendered HTML body.',
    example: '<p>Walk through centuries of history.</p>',
  })
  htmlContent!: string;

  @ApiPropertyOptional({
    description: 'SEO title override.',
    nullable: true,
  })
  seoTitle!: string | null;

  @ApiPropertyOptional({
    description: 'SEO description override.',
    nullable: true,
  })
  seoDescription!: string | null;

  @ApiProperty({
    description: 'Localized image references.',
    type: [String],
  })
  imageRefs!: string[];
}

export class BlogTranslationAvailabilityResponseDto {
  @ApiProperty({
    description: 'Locale code being evaluated.',
    example: 'en',
  })
  languageCode!: string;

  @ApiProperty({
    description: 'Whether the locale is published.',
    example: true,
  })
  isPublished!: boolean;

  @ApiProperty({
    description: 'Whether the locale is currently exposed through the public blog APIs.',
    example: true,
  })
  publiclyAvailable!: boolean;
}

export class BlogAdminResponseDto {
  @ApiProperty({
    description: 'Blog post UUID.',
    format: 'uuid',
  })
  id!: string;

  @ApiProperty({
    description: 'Non-localized admin-facing name for the blog post.',
    example: 'Barcelona Historic Center SEO Article',
  })
  name!: string;

  @ApiProperty({
    description: 'Stable public slug.',
    example: 'barcelona-historic-center-guide',
  })
  slug!: string;

  @ApiPropertyOptional({
    description: 'Optional hero media asset UUID.',
    format: 'uuid',
    nullable: true,
  })
  heroMediaId!: string | null;

  @ApiPropertyOptional({
    description: 'Resolved hero media asset.',
    type: () => MediaAssetResponseDto,
    nullable: true,
  })
  heroMedia!: MediaAssetResponseDto | null;

  @ApiProperty({
    description: 'Ordered tag keys assigned to the post.',
    type: [String],
  })
  tagKeys!: string[];

  @ApiProperty({
    description: 'Expanded tag records.',
    type: () => [TagResponseDto],
  })
  tags!: TagResponseDto[];

  @ApiProperty({
    description: 'Localized translations keyed by locale code.',
    type: 'object',
    additionalProperties: { $ref: getSchemaPath(BlogAdminTranslationResponseDto) },
  })
  translations!: Record<string, BlogAdminTranslationResponseDto>;

  @ApiProperty({
    description: 'Per-locale public availability diagnostics.',
    type: () => [BlogTranslationAvailabilityResponseDto],
  })
  translationAvailability!: BlogTranslationAvailabilityResponseDto[];

  @ApiProperty({
    description: 'Audit metadata for create, update, and publish operations.',
    type: () => PublishedRecordAuditMetadataDto,
  })
  audit!: PublishedRecordAuditMetadataDto;
}

export class PublicBlogTranslationResponseDto {
  @ApiProperty({
    description: 'Requested locale code.',
    example: 'en',
  })
  locale!: string;

  @ApiProperty({
    description: 'Published localized title.',
    example: 'Barcelona Historic Center Guide',
  })
  title!: string;

  @ApiPropertyOptional({
    description: 'Published localized summary.',
    nullable: true,
  })
  summary!: string | null;

  @ApiProperty({
    description: 'Published localized HTML body.',
  })
  htmlContent!: string;

  @ApiPropertyOptional({
    description: 'SEO title override.',
    nullable: true,
  })
  seoTitle!: string | null;

  @ApiPropertyOptional({
    description: 'SEO description override.',
    nullable: true,
  })
  seoDescription!: string | null;

  @ApiProperty({
    description: 'Published localized image references.',
    type: [String],
  })
  imageRefs!: string[];

  @ApiProperty({
    description:
      'Aggregated view count for this translation locale. Successful detail requests can increment it at most once per translation and client IP hash every 24 hours.',
    example: 128,
    minimum: 0,
  })
  viewCount!: number;
}

export class PublicBlogResponseDto {
  @ApiProperty({
    description: 'Blog post UUID.',
    format: 'uuid',
  })
  id!: string;

  @ApiProperty({
    description: 'Stable public slug.',
    example: 'barcelona-historic-center-guide',
  })
  slug!: string;

  @ApiPropertyOptional({
    description: 'Resolved hero media asset.',
    type: () => MediaAssetResponseDto,
    nullable: true,
  })
  heroMedia!: MediaAssetResponseDto | null;

  @ApiProperty({
    description: 'Localized tag labels for the requested locale.',
    type: () => [PublicTagResponseDto],
  })
  tags!: PublicTagResponseDto[];

  @ApiProperty({
    description: 'Published localized blog translation selected for the requested locale.',
    type: () => PublicBlogTranslationResponseDto,
  })
  translation!: PublicBlogTranslationResponseDto;

  @ApiProperty({
    description: 'Publication timestamp of the parent blog post.',
    type: String,
    format: 'date-time',
  })
  publishedAt!: string;
}

export class NewsletterSubscriberAdminResponseDto {
  @ApiProperty({
    description: 'Newsletter subscriber UUID.',
    format: 'uuid',
  })
  id!: string;

  @ApiProperty({
    description: 'Normalized subscriber email address.',
    example: 'subscriber@example.com',
  })
  email!: string;

  @ApiProperty({
    description: 'Current newsletter subscription lifecycle state.',
    enum: NEWSLETTER_SUBSCRIPTION_STATUSES,
  })
  subscriptionStatus!: (typeof NEWSLETTER_SUBSCRIPTION_STATUSES)[number];

  @ApiPropertyOptional({
    description: 'Optional preferred locale captured during subscription.',
    example: 'en',
    nullable: true,
  })
  preferredLocale!: string | null;

  @ApiPropertyOptional({
    description: 'Optional consent source identifier, such as `footer_form`.',
    example: 'footer_form',
    nullable: true,
  })
  consentSource!: string | null;

  @ApiProperty({
    description: 'Stored source metadata captured during subscription.',
    type: 'object',
    additionalProperties: true,
    example: {
      page: '/blog/barcelona-historic-center-guide',
      campaign: 'spring-2026',
    },
  })
  sourceMetadata!: Record<string, unknown>;

  @ApiProperty({
    description: 'Timestamp at which consent was captured.',
    type: String,
    format: 'date-time',
  })
  consentedAt!: string;

  @ApiPropertyOptional({
    description: 'Timestamp at which the subscriber confirmed the double opt-in email.',
    type: String,
    format: 'date-time',
    nullable: true,
  })
  confirmedAt!: string | null;

  @ApiPropertyOptional({
    description: 'Timestamp at which the subscriber unsubscribed.',
    type: String,
    format: 'date-time',
    nullable: true,
  })
  unsubscribedAt!: string | null;

  @ApiProperty({
    description: 'Creation timestamp.',
    type: String,
    format: 'date-time',
  })
  createdAt!: string;

  @ApiProperty({
    description: 'Last update timestamp.',
    type: String,
    format: 'date-time',
  })
  updatedAt!: string;
}

export class NewsletterSubscriberAdminListResponseDto {
  @ApiProperty({
    description: 'Paginated subscriber records.',
    type: () => [NewsletterSubscriberAdminResponseDto],
  })
  items!: NewsletterSubscriberAdminResponseDto[];

  @ApiProperty({
    description: 'Total number of matching records before pagination.',
    example: 1250,
  })
  total!: number;

  @ApiProperty({
    description: '1-based page number.',
    example: 1,
  })
  page!: number;

  @ApiProperty({
    description: 'Page size used for the response.',
    example: 50,
  })
  limit!: number;
}

export class NewsletterSubscriptionRequestedResponseDto {
  @ApiProperty({
    description: 'Normalized subscriber email address.',
    example: 'subscriber@example.com',
  })
  email!: string;

  @ApiProperty({
    description: 'Current subscription state after the subscribe request.',
    enum: NEWSLETTER_SUBSCRIPTION_STATUSES,
    example: 'pending_confirmation',
  })
  subscriptionStatus!: (typeof NEWSLETTER_SUBSCRIPTION_STATUSES)[number];

  @ApiProperty({
    description: 'Whether the email was already actively subscribed before this request.',
    example: false,
  })
  alreadySubscribed!: boolean;

  @ApiProperty({
    description: 'What the subscriber must do next.',
    enum: ['confirm_email', 'none'],
    example: 'confirm_email',
  })
  nextAction!: 'confirm_email' | 'none';

  @ApiPropertyOptional({
    description: 'Optional preferred locale retained for the subscriber.',
    example: 'en',
    nullable: true,
  })
  preferredLocale!: string | null;

  @ApiProperty({
    description: 'Timestamp at which consent was captured for this subscription attempt.',
    type: String,
    format: 'date-time',
  })
  consentedAt!: string;
}

export class NewsletterSubscriptionConfirmedResponseDto {
  @ApiProperty({
    description: 'Normalized subscriber email address.',
    example: 'subscriber@example.com',
  })
  email!: string;

  @ApiProperty({
    description: 'Current subscription state after confirmation.',
    enum: NEWSLETTER_SUBSCRIPTION_STATUSES,
    example: 'subscribed',
  })
  subscriptionStatus!: (typeof NEWSLETTER_SUBSCRIPTION_STATUSES)[number];

  @ApiProperty({
    description: 'Timestamp at which double opt-in confirmation was completed.',
    type: String,
    format: 'date-time',
  })
  confirmedAt!: string;
}

export class NewsletterUnsubscribedResponseDto {
  @ApiProperty({
    description: 'Normalized subscriber email address.',
    example: 'subscriber@example.com',
  })
  email!: string;

  @ApiProperty({
    description: 'Current subscription state after unsubscription.',
    enum: NEWSLETTER_SUBSCRIPTION_STATUSES,
    example: 'unsubscribed',
  })
  subscriptionStatus!: (typeof NEWSLETTER_SUBSCRIPTION_STATUSES)[number];

  @ApiPropertyOptional({
    description: 'Timestamp at which the subscriber was unsubscribed.',
    type: String,
    format: 'date-time',
    nullable: true,
  })
  unsubscribedAt!: string | null;
}

export const SWAGGER_EXTRA_MODELS = [
  ErrorResponseDto,
  AuditMetadataDto,
  RecordAuditMetadataDto,
  PublishedRecordAuditMetadataDto,
  HealthFoundationDto,
  HealthResponseDto,
  LanguageResponseDto,
  TagResponseDto,
  PublicTagResponseDto,
  RoleResponseDto,
  AdminUserResponseDto,
  AuthenticatedAdminResponseDto,
  LogoutResponseDto,
  GeoCoordinatesDto,
  SharedPointResponseDto,
  PublicPointResponseDto,
  MediaAssetResponseDto,
  AdminMediaAssetResponseDto,
  AdminMediaAssetListResponseDto,
  TourMediaItemResponseDto,
  UploadedMediaResponseDto,
  PriceResponseDto,
  TourNextConnectionResponseDto,
  TourAdminItineraryStopResponseDto,
  PublicTourStopResponseDto,
  TourAdminItineraryResponseDto,
  PublicTourItineraryResponseDto,
  TourAdminTranslationResponseDto,
  TourTranslationAvailabilityResponseDto,
  PublicTourTranslationResponseDto,
  TourAdminResponseDto,
  PublicTourResponseDto,
  BlogAdminTranslationResponseDto,
  BlogTranslationAvailabilityResponseDto,
  BlogAdminResponseDto,
  PublicBlogTranslationResponseDto,
  PublicBlogResponseDto,
  NewsletterSubscriberAdminResponseDto,
  NewsletterSubscriberAdminListResponseDto,
  NewsletterSubscriptionRequestedResponseDto,
  NewsletterSubscriptionConfirmedResponseDto,
  NewsletterUnsubscribedResponseDto,
];
