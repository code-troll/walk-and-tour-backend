import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

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

}
