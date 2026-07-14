import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

import { OCCURRENCE_STATUSES, OccurrenceStatus } from '../../shared/domain';

export class ConfirmOccurrenceDto {
  @ApiProperty({
    description:
      'Date being confirmed. Must match a candidate date produced by the event schedule.',
    type: String,
    format: 'date-time',
  })
  @IsISO8601()
  date!: string;

  @ApiPropertyOptional({
    description: 'UUIDs of the team member(s) assigned as guide(s) for this date (0 or more).',
    type: [String],
    format: 'uuid',
  })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  teamMemberIds?: string[];

  @ApiPropertyOptional({
    description: 'Free-text note specific to this date.',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;

  @ApiPropertyOptional({
    description:
      'Status to create the occurrence with. Defaults to `confirmed`. Use `cancelled` to mark a scheduled date off without assigning a guide.',
    enum: OCCURRENCE_STATUSES,
    default: 'confirmed',
  })
  @IsOptional()
  @IsIn(OCCURRENCE_STATUSES)
  status?: OccurrenceStatus;
}
