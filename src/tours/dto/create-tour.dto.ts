import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

import {
  TOUR_CANCELLATION_TYPES,
  TOUR_COMMUTE_MODES,
  TOUR_PUBLICATION_STATUSES,
  TOUR_TRANSLATION_PUBLICATION_STATUSES,
  TOUR_TRANSLATION_STATUSES,
  TOUR_TYPES,
} from '../../shared/domain';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const STOP_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const LOCALE_CODE_PATTERN = /^[a-z]{2}(?:-[A-Z]{2})?$/;

export class TourCoordinatesDto {
  @ApiProperty({
    description: 'Latitude in decimal degrees.',
    example: 41.3874,
  })
  @IsNumber()
  lat!: number;

  @ApiProperty({
    description: 'Longitude in decimal degrees.',
    example: 2.1686,
  })
  @IsNumber()
  lng!: number;
}

export class SharedPointDto {
  @ApiPropertyOptional({
    description: 'Optional shared coordinates for the point.',
    type: () => TourCoordinatesDto,
  })
  @ValidateNested()
  @Type(() => TourCoordinatesDto)
  @IsOptional()
  coordinates?: TourCoordinatesDto;
}

export class PriceDto {
  @ApiProperty({
    description: 'Fixed price amount. Only valid for non-tip-based tours.',
    example: 25,
    minimum: 0,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount!: number;

  @ApiProperty({
    description: 'Currency code paired with the fixed amount.',
    example: 'EUR',
    maxLength: 10,
  })
  @IsString()
  @MaxLength(10)
  currency!: string;
}

export class TourItineraryConnectionDto {
  @ApiPropertyOptional({
    description: 'Travel time in minutes to the next stop.',
    example: 8,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  durationMinutes?: number;

  @ApiProperty({
    description: 'Commute mode used to move to the next stop.',
    enum: TOUR_COMMUTE_MODES,
    example: 'walk',
  })
  @IsString()
  @IsIn(TOUR_COMMUTE_MODES)
  commuteMode!: string;
}

export class TourItineraryStopDto {
  @ApiProperty({
    description: 'Stable stop identifier shared across translations.',
    example: 'stop-1',
    pattern: STOP_ID_PATTERN.source,
    maxLength: 100,
  })
  @IsString()
  @Matches(STOP_ID_PATTERN)
  @MaxLength(100)
  id!: string;

  @ApiPropertyOptional({
    description: 'Duration spent at the stop in minutes.',
    example: 15,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  durationMinutes?: number;

  @ApiPropertyOptional({
    description: 'Optional stop coordinates.',
    type: () => TourCoordinatesDto,
  })
  @ValidateNested()
  @Type(() => TourCoordinatesDto)
  @IsOptional()
  coordinates?: TourCoordinatesDto;

  @ApiPropertyOptional({
    description: 'Transport information to the next stop. The final stop must omit this field.',
    type: () => TourItineraryConnectionDto,
  })
  @ValidateNested()
  @Type(() => TourItineraryConnectionDto)
  @IsOptional()
  nextConnection?: TourItineraryConnectionDto;
}

export class TourItineraryDto {
  @ApiProperty({
    description: 'Whether the itinerary is modeled as a localized description or shared ordered stops.',
    enum: ['description', 'stops'],
    example: 'description',
  })
  @IsString()
  @IsIn(['description', 'stops'])
  variant!: 'description' | 'stops';

  @ApiPropertyOptional({
    description: 'Ordered shared stop list. Required when `variant` is `stops` and forbidden for `description` itineraries.',
    type: () => [TourItineraryStopDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TourItineraryStopDto)
  @IsOptional()
  stops?: TourItineraryStopDto[];
}

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
    description: 'Translation workflow state.',
    enum: TOUR_TRANSLATION_STATUSES,
    example: 'ready',
  })
  @IsString()
  @IsIn(TOUR_TRANSLATION_STATUSES)
  translationStatus!: string;

  @ApiProperty({
    description: 'Translation publication state. A translation can only be published after it is `ready`.',
    enum: TOUR_TRANSLATION_PUBLICATION_STATUSES,
    example: 'published',
  })
  @IsString()
  @IsIn(TOUR_TRANSLATION_PUBLICATION_STATUSES)
  publicationStatus!: string;

  @ApiProperty({
    description: 'Optional external booking reference for this locale.',
    example: 'booking-ref-123',
  })
  @IsString()
  @IsOptional()
  bookingReferenceId?: string;

  @ApiProperty({
    description: 'Localized payload validated against the shared tour content schema.',
    type: 'object',
    additionalProperties: true,
    example: {
      title: 'Historic Center',
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

export class CreateTourDto {
  @ApiProperty({
    description: 'Non-localized admin-facing name used to identify the tour.',
    example: 'Barcelona Historic Center Main Tour',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiProperty({
    description: 'Stable public slug for the tour.',
    example: 'historic-center',
    pattern: SLUG_PATTERN.source,
    maxLength: 150,
  })
  @IsString()
  @Matches(SLUG_PATTERN)
  @MaxLength(150)
  slug!: string;

  @ApiPropertyOptional({
    description: 'Optional business category.',
    example: 'walking',
    maxLength: 100,
  })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({
    description: 'Optional cover media reference.',
    example: 'media/tours/historic-center/cover.jpg',
    maxLength: 255,
  })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  coverMediaRef?: string;

  @ApiPropertyOptional({
    description: 'Additional gallery media references.',
    type: [String],
    example: ['media/tours/historic-center/1.jpg'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  galleryMediaRefs?: string[];

  @ApiProperty({
    description: 'Top-level publication state of the tour.',
    enum: TOUR_PUBLICATION_STATUSES,
    example: 'draft',
  })
  @IsString()
  @IsIn(TOUR_PUBLICATION_STATUSES)
  publicationStatus!: string;

  @ApiProperty({
    description: 'Shared JSON Schema that every translation payload must satisfy once it is `ready` or `published`.',
    type: 'object',
    additionalProperties: true,
  })
  @IsObject()
  @IsNotEmpty()
  contentSchema!: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Fixed price definition. Omit for `tip_based` tours.',
    type: () => PriceDto,
  })
  @ValidateNested()
  @Type(() => PriceDto)
  @IsOptional()
  price?: PriceDto;

  @ApiProperty({
    description: 'Average review score.',
    example: 4.8,
    minimum: 1,
    maximum: 5,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiProperty({
    description: 'Total review count.',
    example: 120,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  reviewCount!: number;

  @ApiProperty({
    description: 'Commercial model of the tour.',
    enum: TOUR_TYPES,
    example: 'group',
  })
  @IsString()
  @IsIn(TOUR_TYPES)
  tourType!: string;

  @ApiProperty({
    description: 'Cancellation policy offered for the tour.',
    enum: TOUR_CANCELLATION_TYPES,
    example: '24h_free_cancellation',
  })
  @IsString()
  @IsIn(TOUR_CANCELLATION_TYPES)
  cancellationType!: string;

  @ApiProperty({
    description: 'Duration in minutes.',
    example: 120,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  durationMinutes!: number;

  @ApiProperty({
    description: 'Shared start point metadata.',
    type: () => SharedPointDto,
  })
  @ValidateNested()
  @Type(() => SharedPointDto)
  startPoint!: SharedPointDto;

  @ApiProperty({
    description: 'Shared end point metadata.',
    type: () => SharedPointDto,
  })
  @ValidateNested()
  @Type(() => SharedPointDto)
  endPoint!: SharedPointDto;

  @ApiProperty({
    description: 'Shared itinerary structure.',
    type: () => TourItineraryDto,
  })
  @ValidateNested()
  @Type(() => TourItineraryDto)
  itinerary!: TourItineraryDto;

  @ApiProperty({
    description: 'Ordered tag keys assigned to the tour.',
    type: [String],
    example: ['history'],
  })
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  tagKeys!: string[];

  @ApiPropertyOptional({
    description: 'Localized translations to create together with the tour.',
    type: () => [CreateTourTranslationDto],
  })
  @IsArray()
  @ArrayUnique((translation: CreateTourTranslationDto) => translation.languageCode)
  @ValidateNested({ each: true })
  @Type(() => CreateTourTranslationDto)
  @IsOptional()
  translations?: CreateTourTranslationDto[];
}
