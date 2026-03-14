import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsUUID, Min } from 'class-validator';

import { LocalizedAltTextDto } from './create-tour.dto';

export class AttachTourMediaDto extends LocalizedAltTextDto {
  @ApiProperty({
    description: 'Uploaded media asset UUID to attach to the tour.',
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
}

export class UpdateTourMediaDto extends LocalizedAltTextDto {
  @ApiPropertyOptional({
    description: 'Optional explicit display order. If omitted, the existing order is preserved.',
    example: 0,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  orderIndex?: number;
}

export class SetTourCoverMediaDto {
  @ApiProperty({
    description: 'Attached image media asset UUID to use as the tour cover.',
    format: 'uuid',
  })
  @IsUUID()
  mediaId!: string;
}
