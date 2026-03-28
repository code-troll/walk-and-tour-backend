import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

const LOCALE_CODE_PATTERN = /^[a-z]{2}(?:-[A-Z]{2})?$/;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class CreateBlogPostTranslationDto {
  @ApiProperty({
    description: 'Locale code for this blog translation.',
    example: 'en',
    pattern: LOCALE_CODE_PATTERN.source,
  })
  @IsString()
  @Matches(LOCALE_CODE_PATTERN)
  languageCode!: string;

  @ApiProperty({
    description: 'Public slug for this translation.',
    example: 'barcelona-historic-center-guide',
    pattern: SLUG_PATTERN.source,
    maxLength: 150,
  })
  @IsString()
  @Matches(SLUG_PATTERN)
  @MaxLength(150)
  slug!: string;

  @ApiPropertyOptional({
    description: 'Localized title.',
    example: 'Barcelona Historic Center Guide',
    maxLength: 255,
  })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({
    description: 'Localized summary or excerpt.',
    example: 'A walking guide to the historic center of Barcelona.',
  })
  @IsString()
  @IsOptional()
  summary?: string;

  @ApiPropertyOptional({
    description: 'Localized HTML body.',
    example: '<p>Walk through centuries of history.</p>',
  })
  @IsString()
  @IsOptional()
  htmlContent?: string;

  @ApiPropertyOptional({
    description: 'Optional SEO title override.',
    example: 'Historic Center Guide | Walk and Tour',
    maxLength: 255,
  })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  seoTitle?: string;

  @ApiPropertyOptional({
    description: 'Optional SEO meta description override.',
    example: 'Discover the best historic landmarks in Barcelona.',
  })
  @IsString()
  @IsOptional()
  seoDescription?: string;

  @ApiPropertyOptional({
    description: 'Localized image references used by the article.',
    type: [String],
    example: ['media/blog/historic-center/hero.jpg'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  imageRefs?: string[];
}

export class UpdateBlogPostTranslationDto {
  @ApiPropertyOptional({
    description: 'Updated public slug.',
    example: 'barcelona-historic-center-guide',
    pattern: SLUG_PATTERN.source,
    maxLength: 150,
  })
  @IsString()
  @Matches(SLUG_PATTERN)
  @MaxLength(150)
  @IsOptional()
  slug?: string;

  @ApiPropertyOptional({
    description: 'Updated localized title.',
    example: 'Barcelona Historic Center Guide',
    maxLength: 255,
  })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({
    description: 'Updated localized summary or excerpt. Set `null` to clear it.',
    example: 'A walking guide to the historic center of Barcelona.',
    nullable: true,
  })
  @IsString()
  @IsOptional()
  summary?: string | null;

  @ApiPropertyOptional({
    description: 'Updated localized HTML body.',
    example: '<p>Walk through centuries of history.</p>',
  })
  @IsString()
  @IsOptional()
  htmlContent?: string;

  @ApiPropertyOptional({
    description: 'Updated SEO title override. Set `null` to clear it.',
    example: 'Historic Center Guide | Walk and Tour',
    maxLength: 255,
    nullable: true,
  })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  seoTitle?: string | null;

  @ApiPropertyOptional({
    description: 'Updated SEO meta description override. Set `null` to clear it.',
    example: 'Discover the best historic landmarks in Barcelona.',
    nullable: true,
  })
  @IsString()
  @IsOptional()
  seoDescription?: string | null;

  @ApiPropertyOptional({
    description: 'Replacement localized image references. Omit to keep the current list.',
    type: [String],
    example: ['media/blog/historic-center/hero.jpg'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  imageRefs?: string[];
}
