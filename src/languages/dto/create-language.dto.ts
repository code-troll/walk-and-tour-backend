import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';

const LOCALE_CODE_PATTERN = /^[a-z]{2}(?:-[A-Z]{2})?$/;

export class CreateLanguageDto {
  @ApiProperty({
    description: 'Locale code used throughout translation-aware endpoints.',
    example: 'en',
    pattern: LOCALE_CODE_PATTERN.source,
  })
  @IsString()
  @Matches(LOCALE_CODE_PATTERN)
  code!: string;

  @ApiProperty({
    description: 'Human-readable display name for the locale.',
    example: 'English',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({
    description: 'Whether the locale is enabled for public APIs.',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;

  @ApiProperty({
    description: 'Ordering index used when listing locales in admin and public selectors.',
    example: 1,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  sortOrder!: number;
}
