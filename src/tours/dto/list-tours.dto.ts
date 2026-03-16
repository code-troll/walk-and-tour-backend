import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

import { TOUR_TYPES } from '../../shared/domain';
import { LocaleQueryDto } from '../../shared/dto/locale-query.dto';

const TAG_KEY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function toStringArray(value: unknown): string[] | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const parts = (Array.isArray(value) ? value : [value])
    .flatMap((entry) =>
      typeof entry === 'string'
        ? entry.split(',')
        : [String(entry)],
    )
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  return parts.length > 0 ? parts : undefined;
}

export class TourFilterQueryDto {
  @ApiPropertyOptional({
    description:
      'Optional tag-key filter. Matches tours that include at least one of the provided tag keys. Accepts comma-separated values or repeated query params.',
    type: [String],
    example: ['history', 'architecture'],
  })
  @Transform(({ value }) => toStringArray(value))
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  @Matches(TAG_KEY_PATTERN, { each: true })
  @IsOptional()
  tagKeys?: string[];

  @ApiPropertyOptional({
    description:
      'Optional tour-type filter. Matches tours whose type is one of the provided values. Accepts comma-separated values or repeated query params.',
    enum: TOUR_TYPES,
    isArray: true,
    example: ['company', 'group'],
  })
  @Transform(({ value }) => toStringArray(value))
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  @IsIn(TOUR_TYPES, { each: true })
  @IsOptional()
  tourTypes?: string[];
}

export class AdminListToursDto extends TourFilterQueryDto {}

export class PublicListToursDto extends LocaleQueryDto {
  @ApiPropertyOptional({
    description:
      'Optional tag-key filter. Matches tours that include at least one of the provided tag keys. Accepts comma-separated values or repeated query params.',
    type: [String],
    example: ['history', 'architecture'],
  })
  @Transform(({ value }) => toStringArray(value))
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  @Matches(TAG_KEY_PATTERN, { each: true })
  @IsOptional()
  tagKeys?: string[];

  @ApiPropertyOptional({
    description:
      'Optional tour-type filter. Matches tours whose type is one of the provided values. Accepts comma-separated values or repeated query params.',
    enum: TOUR_TYPES,
    isArray: true,
    example: ['company', 'group'],
  })
  @Transform(({ value }) => toStringArray(value))
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  @IsIn(TOUR_TYPES, { each: true })
  @IsOptional()
  tourTypes?: string[];
}
