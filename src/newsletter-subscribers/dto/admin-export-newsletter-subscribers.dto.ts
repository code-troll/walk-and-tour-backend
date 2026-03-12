import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

import { NEWSLETTER_SUBSCRIPTION_STATUSES } from '../../shared/domain';

export class AdminExportNewsletterSubscribersDto {
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
}
