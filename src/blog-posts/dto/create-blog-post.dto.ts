import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';

import {
  BLOG_PUBLICATION_STATUSES,
  BLOG_TRANSLATION_PUBLICATION_STATUSES,
} from '../../shared/domain';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const LOCALE_CODE_PATTERN = /^[a-z]{2}(?:-[A-Z]{2})?$/;

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
    description: 'Publication state of the localized blog translation.',
    enum: BLOG_TRANSLATION_PUBLICATION_STATUSES,
    example: 'published',
  })
  @IsString()
  @IsIn(BLOG_TRANSLATION_PUBLICATION_STATUSES)
  publicationStatus!: string;

  @ApiPropertyOptional({
    description: 'Localized title. Required before the translation can be published.',
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
    description: 'Localized HTML body. Required before the translation can be published.',
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

export class CreateBlogPostDto {
  @ApiProperty({
    description: 'Non-localized admin-facing name used to identify the blog post.',
    example: 'Barcelona Historic Center SEO Article',
    minLength: 1,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiProperty({
    description: 'Stable public slug for the blog post.',
    example: 'barcelona-historic-center-guide',
    pattern: SLUG_PATTERN.source,
    maxLength: 150,
  })
  @IsString()
  @Matches(SLUG_PATTERN)
  @MaxLength(150)
  slug!: string;

  @ApiPropertyOptional({
    description: 'Optional hero media reference.',
    example: 'media/blog/historic-center/hero.jpg',
    maxLength: 255,
  })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  heroMediaRef?: string;

  @ApiProperty({
    description: 'Top-level publication state of the blog post.',
    enum: BLOG_PUBLICATION_STATUSES,
    example: 'draft',
  })
  @IsString()
  @IsIn(BLOG_PUBLICATION_STATUSES)
  publicationStatus!: string;

  @ApiPropertyOptional({
    description: 'Assigned tag keys.',
    type: [String],
    example: ['history', 'city-guide'],
    uniqueItems: true,
  })
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  @IsOptional()
  tagKeys?: string[];

  @ApiPropertyOptional({
    description: 'Localized translations keyed by locale through an array of translation objects.',
    type: () => [CreateBlogPostTranslationDto],
    uniqueItems: true,
  })
  @IsArray()
  @ArrayUnique(
    (translation: CreateBlogPostTranslationDto) => translation.languageCode,
  )
  @ValidateNested({ each: true })
  @Type(() => CreateBlogPostTranslationDto)
  @IsOptional()
  translations?: CreateBlogPostTranslationDto[];
}
