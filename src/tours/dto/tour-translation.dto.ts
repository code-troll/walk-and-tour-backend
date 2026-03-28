import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

const LOCALE_CODE_PATTERN = /^[a-z]{2}(?:-[A-Z]{2})?$/;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class CreateTourTranslationDto {
  @ApiProperty({
    description: 'Locale code for this tour translation.',
    example: 'en',
    pattern: LOCALE_CODE_PATTERN.source,
  })
  @IsString()
  @Matches(LOCALE_CODE_PATTERN)
  languageCode!: string;

  @ApiProperty({
    description: 'Public slug for this translation.',
    example: 'historic-center',
    pattern: SLUG_PATTERN.source,
    maxLength: 150,
  })
  @IsString()
  @Matches(SLUG_PATTERN)
  @MaxLength(150)
  slug!: string;

  @ApiPropertyOptional({
    description: 'Optional external booking reference for this locale. Set `null` to clear it on update.',
    example: 'booking-ref-123',
    nullable: true,
  })
  @IsString()
  @IsOptional()
  bookingReferenceId?: string | null;

  @ApiProperty({
    description: 'Localized payload validated against the shared tour content schema when available.',
    type: 'object',
    additionalProperties: true,
    example: {
      title: 'Historic Center',
      cancellationType: 'Free cancellation up to 24 hours before the start time.',
      highlights: ['Gothic Quarter landmarks', 'Roman walls'],
      included: ['Local guide', 'City map'],
      notIncluded: ['Hotel pickup', 'Food and drinks'],
      startPoint: { label: 'Town Hall' },
      endPoint: { label: 'Cathedral' },
      itineraryDescription: 'Walk through the center.',
    },
  })
  @IsObject()
  payload!: Record<string, unknown>;
}

export class UpdateTourTranslationDto {
  @ApiPropertyOptional({
    description: 'Updated public slug.',
    example: 'historic-center',
    pattern: SLUG_PATTERN.source,
    maxLength: 150,
  })
  @IsString()
  @Matches(SLUG_PATTERN)
  @MaxLength(150)
  @IsOptional()
  slug?: string;

  @ApiPropertyOptional({
    description: 'Updated external booking reference for this locale. Set `null` to clear it.',
    example: 'booking-ref-123',
    nullable: true,
  })
  @IsString()
  @IsOptional()
  bookingReferenceId?: string | null;

  @ApiPropertyOptional({
    description: 'Replacement localized payload. Omit to keep the existing payload.',
    type: 'object',
    additionalProperties: true,
  })
  @IsObject()
  @IsOptional()
  payload?: Record<string, unknown>;
}

export class PublishTourTranslationDto {
  @ApiPropertyOptional({
    description: 'Optional external booking reference override applied before publishing. Set `null` to clear it.',
    example: 'booking-ref-123',
    nullable: true,
  })
  @IsString()
  @IsOptional()
  bookingReferenceId?: string | null;
}
