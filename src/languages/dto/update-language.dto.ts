import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateLanguageDto {
  @ApiPropertyOptional({
    description: 'Updated display name for the locale.',
    example: 'English (US)',
    maxLength: 100,
  })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'Whether the locale remains publicly enabled.',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Updated ordering index for admin/public locale lists.',
    example: 2,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;
}
