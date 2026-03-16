import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  IsUUID,
  ValidateNested,
} from 'class-validator';

import { TOUR_TYPES } from '../../shared/domain';
import { PriceDto, SharedPointDto, TourItineraryDto } from './create-tour.dto';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class UpdateTourDto {
  @ApiPropertyOptional({
    description: 'Updated non-localized admin-facing name.',
    example: 'Barcelona Historic Center Main Tour',
    minLength: 1,
    maxLength: 255,
  })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  name?: string;

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
    description: 'Updated shared JSON Schema for localized payload validation.',
    type: 'object',
    additionalProperties: true,
  })
  @IsObject()
  @IsOptional()
  contentSchema?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Updated fixed price. Set `null` to remove price data.',
    type: () => PriceDto,
    nullable: true,
  })
  @ValidateNested()
  @Type(() => PriceDto)
  @IsOptional()
  price?: PriceDto | null;

  @ApiPropertyOptional({
    description: 'Updated average rating.',
    example: 4.9,
    minimum: 1,
    maximum: 5,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(5)
  @IsOptional()
  rating?: number;

  @ApiPropertyOptional({
    description: 'Updated review count.',
    example: 135,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  reviewCount?: number;

  @ApiPropertyOptional({
    description: 'Updated commercial model.',
    enum: TOUR_TYPES,
    example: 'group',
  })
  @IsString()
  @IsIn(TOUR_TYPES)
  @IsOptional()
  tourType?: string;

  @ApiPropertyOptional({
    description: 'Updated duration in minutes.',
    example: 150,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  durationMinutes?: number;

  @ApiPropertyOptional({
    description: 'Replacement shared start point metadata.',
    type: () => SharedPointDto,
  })
  @ValidateNested()
  @Type(() => SharedPointDto)
  @IsOptional()
  startPoint?: SharedPointDto;

  @ApiPropertyOptional({
    description: 'Replacement shared end point metadata.',
    type: () => SharedPointDto,
  })
  @ValidateNested()
  @Type(() => SharedPointDto)
  @IsOptional()
  endPoint?: SharedPointDto;

  @ApiPropertyOptional({
    description: 'Replacement itinerary definition. For stop-based itineraries the full ordered list should be provided.',
    type: () => TourItineraryDto,
  })
  @ValidateNested()
  @Type(() => TourItineraryDto)
  @IsOptional()
  itinerary?: TourItineraryDto;

  @ApiPropertyOptional({
    description: 'Replacement ordered tag key list.',
    type: [String],
    uniqueItems: true,
  })
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  @IsOptional()
  tagKeys?: string[];

}
