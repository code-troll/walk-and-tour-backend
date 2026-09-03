import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class UpdateOccurrenceDto {
  @ApiPropertyOptional({
    description: 'Replacement set of assigned guide UUIDs. Replaces the existing assignment.',
    type: [String],
    format: 'uuid',
  })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  teamMemberIds?: string[];

  @ApiPropertyOptional({
    type: String,
    description: 'Free-text note specific to this date. Set `null` to clear it.',
    maxLength: 2000,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string | null;
}
