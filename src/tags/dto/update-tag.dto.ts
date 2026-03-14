import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsObject, IsOptional } from 'class-validator';

export class UpdateTagDto {
  @ApiPropertyOptional({
    description:
      'Replacement localized labels keyed by locale code. Each label can be at most 100 characters long.',
    type: 'object',
    additionalProperties: { type: 'string', maxLength: 100 },
    example: {
      en: 'History',
      es: 'Historia',
    },
  })
  @IsObject()
  @IsNotEmpty()
  @IsOptional()
  labels?: Record<string, string>;
}
