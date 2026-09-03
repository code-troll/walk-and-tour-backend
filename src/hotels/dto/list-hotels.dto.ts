import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

import { HOTEL_STATUSES } from '../../shared/domain';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

export class ListHotelsDto {
  @ApiPropertyOptional({
    description: 'Case-insensitive partial match against the hotel name or CVR number.',
    example: 'admiral',
    maxLength: 200,
  })
  @IsString()
  @MaxLength(200)
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    description: 'Restrict the results to one lifecycle status.',
    enum: HOTEL_STATUSES,
    example: 'active',
  })
  @IsString()
  @IsIn(HOTEL_STATUSES)
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({
    description: 'One-based page number.',
    example: 1,
    default: DEFAULT_PAGE,
    minimum: 1,
  })
  @Transform(({ value }) => (value === undefined ? DEFAULT_PAGE : Number(value)))
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({
    description: 'Page size.',
    example: 25,
    default: DEFAULT_LIMIT,
    minimum: 1,
    maximum: MAX_LIMIT,
  })
  @Transform(({ value }) => (value === undefined ? DEFAULT_LIMIT : Number(value)))
  @IsInt()
  @Min(1)
  @Max(MAX_LIMIT)
  @IsOptional()
  limit?: number;
}
