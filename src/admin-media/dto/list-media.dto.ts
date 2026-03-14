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

export class ListMediaDto {
  @ApiPropertyOptional({
    description: 'Pagination page number.',
    example: 1,
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({
    description: 'Pagination page size.',
    example: 20,
    minimum: 1,
    maximum: 100,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({
    description: 'Optional media type filter.',
    enum: ['image', 'video'],
    example: 'image',
  })
  @IsString()
  @IsIn(['image', 'video'])
  @IsOptional()
  mediaType?: 'image' | 'video';

  @ApiPropertyOptional({
    description: 'Optional filename/path search term.',
    example: 'historic-center',
    maxLength: 100,
  })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  search?: string;
}
