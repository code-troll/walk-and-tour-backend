import { ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsOptional, IsString, MaxLength } from 'class-validator';

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

}
