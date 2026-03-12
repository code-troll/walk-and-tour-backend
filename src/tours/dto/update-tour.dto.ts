import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsInt,
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
  CreateTourTranslationDto,
  PriceDto,
  SharedPointDto,
  TourItineraryDto,
} from './create-tour.dto';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class UpdateTourDto {
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
    description: 'Updated business category.',
    example: 'walking',
    maxLength: 100,
  })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({
    description: 'Updated cover media reference. Set `null` to clear the value.',
    example: 'media/tours/historic-center/cover.jpg',
    maxLength: 255,
    nullable: true,
  })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  coverMediaRef?: string | null;

  @ApiPropertyOptional({
    description: 'Replacement gallery media references.',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  galleryMediaRefs?: string[];

  @ApiPropertyOptional({
    description: 'Updated top-level publication state.',
    enum: ['draft', 'published'],
    example: 'published',
  })
  @IsString()
  @IsOptional()
  publicationStatus?: string;

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
    enum: ['private', 'group', 'tip_based'],
    example: 'group',
  })
  @IsString()
  @IsOptional()
  tourType?: string;

  @ApiPropertyOptional({
    description: 'Updated cancellation policy.',
    enum: [
      '12h_free_cancellation',
      '24h_free_cancellation',
      '48h_free_cancellation',
      '72h_free_cancellation',
    ],
    example: '24h_free_cancellation',
  })
  @IsString()
  @IsOptional()
  cancellationType?: string;

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
  })
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  @IsOptional()
  tagKeys?: string[];

  @ApiPropertyOptional({
    description: 'Translations to merge into the existing translation set by locale code.',
    type: () => [CreateTourTranslationDto],
  })
  @IsArray()
  @ArrayUnique((translation: CreateTourTranslationDto) => translation.languageCode)
  @ValidateNested({ each: true })
  @Type(() => CreateTourTranslationDto)
  @IsOptional()
  translations?: CreateTourTranslationDto[];
}
