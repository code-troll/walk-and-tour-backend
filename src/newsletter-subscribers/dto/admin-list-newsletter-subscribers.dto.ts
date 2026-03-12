import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import { NEWSLETTER_SUBSCRIPTION_STATUSES } from '../../shared/domain';

export class AdminListNewsletterSubscribersDto {
  @ApiPropertyOptional({
    description: 'Case-insensitive email search term.',
    example: 'subscriber@example.com',
    maxLength: 255,
  })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  q?: string;

  @ApiPropertyOptional({
    description: 'Optional subscription status filter.',
    enum: NEWSLETTER_SUBSCRIPTION_STATUSES,
    example: 'subscribed',
  })
  @IsString()
  @IsIn(NEWSLETTER_SUBSCRIPTION_STATUSES)
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({
    description: '1-based page number.',
    example: 1,
    default: 1,
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({
    description: 'Page size. Maximum 200.',
    example: 50,
    default: 50,
    minimum: 1,
    maximum: 200,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  @IsOptional()
  limit?: number;
}
