import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsObject, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

const LOCALE_CODE_PATTERN = /^[a-z]{2}(?:-[A-Z]{2})?$/;

export class SubscribeNewsletterDto {
  @ApiProperty({
    description: 'Subscriber email address. Duplicate subscribe attempts are normalized by email.',
    example: 'subscriber@example.com',
  })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({
    description: 'Optional preferred locale for future newsletter targeting.',
    example: 'en',
    pattern: LOCALE_CODE_PATTERN.source,
  })
  @IsString()
  @Matches(LOCALE_CODE_PATTERN)
  @IsOptional()
  preferredLocale?: string;

  @ApiPropertyOptional({
    description: 'Optional source identifier for consent capture, such as `footer_form`.',
    example: 'footer_form',
    maxLength: 100,
  })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  consentSource?: string;

  @ApiPropertyOptional({
    description: 'Optional additional source metadata stored for audit and operational context.',
    type: 'object',
    additionalProperties: true,
    example: {
      page: '/blog/barcelona-historic-center-guide',
      campaign: 'spring-2026',
    },
  })
  @IsObject()
  @IsOptional()
  sourceMetadata?: Record<string, unknown>;
}
