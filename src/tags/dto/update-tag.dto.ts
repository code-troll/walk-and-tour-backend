import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsObject, IsOptional } from 'class-validator';

export class UpdateTagDto {
  @ApiPropertyOptional({
    description: 'Replacement localized labels keyed by locale code.',
    type: 'object',
    additionalProperties: { type: 'string' },
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
