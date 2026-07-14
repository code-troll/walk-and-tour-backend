import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export class CreateUnavailableDateDto {
  @ApiProperty({
    description: 'First unavailable day (inclusive), as a calendar date.',
    type: String,
    format: 'date',
    example: '2026-07-01',
  })
  @IsISO8601()
  startDate!: string;

  @ApiProperty({
    description: 'Last unavailable day (inclusive). Equal to `startDate` for a single day off.',
    type: String,
    format: 'date',
    example: '2026-07-10',
  })
  @IsISO8601()
  endDate!: string;

  @ApiPropertyOptional({
    description: 'Optional human-readable reason.',
    maxLength: 255,
    example: 'Vacation',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}

export class CreateRecurringUnavailabilityDto {
  @ApiProperty({
    description: 'Weekday the team member is unavailable (0 = Sunday … 6 = Saturday).',
    minimum: 0,
    maximum: 6,
    example: 0,
  })
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @ApiPropertyOptional({
    description: 'Start of the unavailable window (HH:mm, UTC). Omit with `endTime` for whole-day.',
    example: '00:00',
    pattern: TIME_PATTERN.source,
  })
  @IsOptional()
  @IsString()
  @Matches(TIME_PATTERN)
  startTime?: string;

  @ApiPropertyOptional({
    description: 'End of the unavailable window (HH:mm, UTC). Omit with `startTime` for whole-day.',
    example: '09:00',
    pattern: TIME_PATTERN.source,
  })
  @IsOptional()
  @IsString()
  @Matches(TIME_PATTERN)
  endTime?: string;
}
