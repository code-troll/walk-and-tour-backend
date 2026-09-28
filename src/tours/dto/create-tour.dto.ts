import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
  IsOptional,
  IsNotEmpty,
} from 'class-validator';

import {
  TOUR_BOOKING_PROVIDERS,
  TOUR_COMMUTE_MODES,
  TOUR_PRICE_BASES,
  TOUR_TYPES,
  TourBookingProvider,
  TourPriceBasis,
} from '../../shared/domain';
const STOP_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

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

export class LocalizedAltTextDto {
  @ApiPropertyOptional({
    description: 'Optional localized alt text keyed by locale code.',
    type: 'object',
    additionalProperties: {
      type: 'string',
      maxLength: 255,
    },
    example: {
      en: 'View of the cathedral facade',
      es: 'Vista de la fachada de la catedral',
    },
  })
  @IsObject()
  @IsOptional()
  altText?: Record<string, string>;
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

  @ApiPropertyOptional({
    description:
      'Whether the amount is charged per person or once for the whole group. When omitted, the tour keeps the basis it has, which is `per_person` for a tour that had no price.',
    enum: TOUR_PRICE_BASES,
    example: 'per_person',
  })
  @IsIn(TOUR_PRICE_BASES)
  @IsOptional()
  basis?: TourPriceBasis;
}

export class TourBookingDto {
  @ApiPropertyOptional({
    description:
      'Booking widget the public page embeds. Each translation\'s `bookingReferenceId` is this provider\'s product id: required for `turitop`, optional for `understory`, where it names one experience. Set `null` to remove it, which also requires `enabled` to be false. When omitted, the tour keeps its provider.',
    enum: TOUR_BOOKING_PROVIDERS,
    example: 'turitop',
    nullable: true,
  })
  @IsIn(TOUR_BOOKING_PROVIDERS)
  @IsOptional()
  provider?: TourBookingProvider | null;

  @ApiPropertyOptional({
    description:
      'Whether the public page shows the widget. Enabling it requires a provider. Disabling it keeps the provider. When omitted, the tour keeps its current state.',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @ApiPropertyOptional({
    description:
      'Provider settings, all strings. `turitop` takes none; `understory` takes `companyId` and `storefrontId`, both required once the widget is enabled. Replaces the stored settings. When omitted, the tour keeps them, unless the provider changes, which clears them.',
    type: 'object',
    additionalProperties: { type: 'string', maxLength: 100 },
    example: { companyId: '4a0fbe7f6af34bffac943578ffbfa0e4', storefrontId: 'bd88f0cea152483c9a45b8b4437b85ca' },
  })
  @IsObject()
  @IsOptional()
  settings?: Record<string, string>;
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

export class CreateTourDto {
  @ApiProperty({
    description: 'Non-localized admin-facing name used to identify the tour.',
    example: 'Barcelona Historic Center Main Tour',
    minLength: 1,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiProperty({
    description: 'Commercial model of the tour. Required during minimal creation.',
    enum: TOUR_TYPES,
    example: 'group',
  })
  @IsString()
  @IsIn(TOUR_TYPES)
  tourType!: string;

  @ApiPropertyOptional({
    description:
      'Optional manual display position used by admin and public tour lists. When omitted, the tour is appended to the end.',
    example: 3,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;
}
