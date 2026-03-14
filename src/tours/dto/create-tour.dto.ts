import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
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

import { TOUR_COMMUTE_MODES, TOUR_TYPES } from '../../shared/domain';
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
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
    description: 'Stable public slug for the tour.',
    example: 'historic-center',
    pattern: SLUG_PATTERN.source,
    maxLength: 150,
  })
  @IsString()
  @Matches(SLUG_PATTERN)
  @MaxLength(150)
  slug!: string;

  @ApiProperty({
    description: 'Commercial model of the tour. Required during minimal creation.',
    enum: TOUR_TYPES,
    example: 'group',
  })
  @IsString()
  @IsIn(TOUR_TYPES)
  tourType!: string;
}
