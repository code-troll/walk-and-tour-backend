import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
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
  @IsString()
  @Matches(SLUG_PATTERN)
  @MaxLength(150)
  @IsOptional()
  slug?: string;

  @IsString()
  @MaxLength(100)
  @IsOptional()
  category?: string;

  @IsString()
  @MaxLength(255)
  @IsOptional()
  coverMediaRef?: string | null;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  galleryMediaRefs?: string[];

  @IsString()
  @IsOptional()
  publicationStatus?: string;

  @IsBoolean()
  @IsOptional()
  isHidden?: boolean;

  @IsObject()
  @IsOptional()
  contentSchema?: Record<string, unknown>;

  @ValidateNested()
  @Type(() => PriceDto)
  @IsOptional()
  price?: PriceDto | null;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(5)
  @IsOptional()
  rating?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  reviewCount?: number;

  @IsString()
  @IsOptional()
  tourType?: string;

  @IsString()
  @IsOptional()
  cancellationType?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  durationMinutes?: number;

  @ValidateNested()
  @Type(() => SharedPointDto)
  @IsOptional()
  startPoint?: SharedPointDto;

  @ValidateNested()
  @Type(() => SharedPointDto)
  @IsOptional()
  endPoint?: SharedPointDto;

  @ValidateNested()
  @Type(() => TourItineraryDto)
  @IsOptional()
  itinerary?: TourItineraryDto;

  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  @IsOptional()
  tagKeys?: string[];

  @IsArray()
  @ArrayUnique((translation: CreateTourTranslationDto) => translation.languageCode)
  @ValidateNested({ each: true })
  @Type(() => CreateTourTranslationDto)
  @IsOptional()
  translations?: CreateTourTranslationDto[];
}
