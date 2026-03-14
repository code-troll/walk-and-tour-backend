import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';

import { CreateBlogPostTranslationDto } from './create-blog-post.dto';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class UpdateBlogPostDto {
  @ApiPropertyOptional({
    description: 'Updated non-localized admin-facing name.',
    example: 'Barcelona Historic Center SEO Article',
    minLength: 1,
    maxLength: 255,
  })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  name?: string;

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
    description: 'Updated top-level publication state.',
    enum: ['draft', 'published'],
    example: 'published',
  })
  @IsString()
  @IsOptional()
  publicationStatus?: string;

  @ApiPropertyOptional({
    description: 'Replacement tag key list.',
    type: [String],
    example: ['history', 'architecture'],
    uniqueItems: true,
  })
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  @IsOptional()
  tagKeys?: string[];

  @ApiPropertyOptional({
    description: 'Translations to merge into the existing set by locale code.',
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
