import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
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
  @IsNumber()
  lat!: number;

  @IsNumber()
  lng!: number;
}

export class SharedPointDto {
  @ValidateNested()
  @Type(() => TourCoordinatesDto)
  @IsOptional()
  coordinates?: TourCoordinatesDto;
}

export class PriceDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount!: number;

  @IsString()
  @MaxLength(10)
  currency!: string;
}

export class TourItineraryConnectionDto {
  @IsInt()
  @Min(0)
  @IsOptional()
  durationMinutes?: number;

  @IsString()
  @IsIn(TOUR_COMMUTE_MODES)
  commuteMode!: string;
}

export class TourItineraryStopDto {
  @IsString()
  @Matches(STOP_ID_PATTERN)
  @MaxLength(100)
  id!: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  durationMinutes?: number;

  @ValidateNested()
  @Type(() => TourCoordinatesDto)
  @IsOptional()
  coordinates?: TourCoordinatesDto;

  @ValidateNested()
  @Type(() => TourItineraryConnectionDto)
  @IsOptional()
  nextConnection?: TourItineraryConnectionDto;
}

export class TourItineraryDto {
  @IsString()
  @IsIn(['description', 'stops'])
  variant!: 'description' | 'stops';

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TourItineraryStopDto)
  @IsOptional()
  stops?: TourItineraryStopDto[];
}

export class CreateTourTranslationDto {
  @IsString()
  @Matches(LOCALE_CODE_PATTERN)
  languageCode!: string;

  @IsString()
  @IsIn(TOUR_TRANSLATION_STATUSES)
  translationStatus!: string;

  @IsString()
  @IsIn(TOUR_TRANSLATION_PUBLICATION_STATUSES)
  publicationStatus!: string;

  @IsBoolean()
  isHidden!: boolean;

  @IsString()
  @IsOptional()
  bookingReferenceId?: string;

  @IsObject()
  payload!: Record<string, unknown>;
}

export class CreateTourDto {
  @IsString()
  @Matches(SLUG_PATTERN)
  @MaxLength(150)
  slug!: string;

  @IsString()
  @MaxLength(100)
  @IsOptional()
  category?: string;

  @IsString()
  @MaxLength(255)
  @IsOptional()
  coverMediaRef?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  galleryMediaRefs?: string[];

  @IsString()
  @IsIn(TOUR_PUBLICATION_STATUSES)
  publicationStatus!: string;

  @IsBoolean()
  isHidden!: boolean;

  @IsObject()
  @IsNotEmpty()
  contentSchema!: Record<string, unknown>;

  @ValidateNested()
  @Type(() => PriceDto)
  @IsOptional()
  price?: PriceDto;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(5)
  rating!: number;

  @IsInt()
  @Min(0)
  reviewCount!: number;

  @IsString()
  @IsIn(TOUR_TYPES)
  tourType!: string;

  @IsString()
  @IsIn(TOUR_CANCELLATION_TYPES)
  cancellationType!: string;

  @IsInt()
  @Min(0)
  durationMinutes!: number;

  @ValidateNested()
  @Type(() => SharedPointDto)
  startPoint!: SharedPointDto;

  @ValidateNested()
  @Type(() => SharedPointDto)
  endPoint!: SharedPointDto;

  @ValidateNested()
  @Type(() => TourItineraryDto)
  itinerary!: TourItineraryDto;

  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  tagKeys!: string[];

  @IsArray()
  @ArrayUnique((translation: CreateTourTranslationDto) => translation.languageCode)
  @ValidateNested({ each: true })
  @Type(() => CreateTourTranslationDto)
  @IsOptional()
  translations?: CreateTourTranslationDto[];

  @IsString()
  @IsOptional()
  createdBy?: string;

  @IsString()
  @IsOptional()
  updatedBy?: string;

  @IsString()
  @IsOptional()
  publishedBy?: string;
}
