import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

import { RECURRENCE_FREQUENCIES, RecurrenceFrequency } from '../../shared/domain';

export class RecurrenceDto {
  @ApiProperty({
    description: 'Recurrence unit.',
    enum: RECURRENCE_FREQUENCIES,
  })
  @IsIn(RECURRENCE_FREQUENCIES)
  freq!: RecurrenceFrequency;

  @ApiProperty({
    description: 'Repeat every N units of `freq` (e.g. interval 2 + weekly = every other week).',
    example: 1,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  interval!: number;

  @ApiPropertyOptional({
    description:
      'Weekdays the event runs on for weekly rules (0 = Sunday … 6 = Saturday). Defaults to the start date weekday when omitted.',
    type: [Number],
    example: [1, 3, 5],
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  byDay?: number[];

  @ApiPropertyOptional({
    description:
      'Inclusive end of the series. Bounds how far candidate dates are generated. Omit for an open-ended series (candidate dates are still bounded by the requested window and a safety cap).',
    type: String,
    format: 'date-time',
    nullable: true,
  })
  @IsOptional()
  @IsISO8601()
  until?: string;
}
