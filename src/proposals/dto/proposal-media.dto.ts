import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsObject, IsOptional, IsUUID, Min } from 'class-validator';

export class AttachProposalMediaDto {
  @ApiProperty({
    description: 'Uploaded media asset UUID to attach to the proposal.',
    format: 'uuid',
  })
  @IsUUID()
  mediaId!: string;

  @ApiPropertyOptional({
    description: 'Optional explicit display order. If omitted, the media is appended to the end.',
    example: 0,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  orderIndex?: number;

  @ApiPropertyOptional({
    description: 'Optional localized alt text keyed by locale code.',
    type: 'object',
    additionalProperties: { type: 'string', maxLength: 255 },
    example: { en: 'View of the walking route' },
  })
  @IsObject()
  @IsOptional()
  altText?: Record<string, string>;
}

export class UpdateProposalMediaDto {
  @ApiPropertyOptional({
    description: 'Optional explicit display order.',
    example: 0,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  orderIndex?: number;

  @ApiPropertyOptional({
    description: 'Optional localized alt text keyed by locale code.',
    type: 'object',
    additionalProperties: { type: 'string', maxLength: 255 },
  })
  @IsObject()
  @IsOptional()
  altText?: Record<string, string>;
}
