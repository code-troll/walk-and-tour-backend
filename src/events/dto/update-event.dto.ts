import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

import {
  EVENT_FREQUENCIES,
  EVENT_TYPES,
  EventFrequency,
  EventType,
} from '../../shared/domain';
import { RecurrenceDto } from './recurrence.dto';

const LOCALE_CODE_PATTERN = /^[a-z]{2}(?:-[A-Z]{2})?$/;

export class UpdateEventDto {
  @ApiPropertyOptional({
    description: 'Language the event is conducted in.',
    example: 'en',
    pattern: LOCALE_CODE_PATTERN.source,
  })
  @IsOptional()
  @IsString()
  @Matches(LOCALE_CODE_PATTERN)
  language?: string;

  @ApiPropertyOptional({
    description: 'Commercial model of the event.',
    enum: EVENT_TYPES,
  })
  @IsOptional()
  @IsIn(EVENT_TYPES)
  type?: EventType;

  @ApiPropertyOptional({
    description: 'UUID of the website tour this event links to. Set `null` to clear it.',
    format: 'uuid',
    nullable: true,
  })
  @IsOptional()
  @IsUUID()
  tourId?: string | null;

  @ApiPropertyOptional({
    description: 'Optional event description. Set `null` to clear it.',
    maxLength: 2000,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @ApiPropertyOptional({
    description: 'Duration of each occurrence in minutes.',
    example: 90,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  durationMinutes?: number;

  @ApiPropertyOptional({
    description: 'Whether the event happens once or recurs.',
    enum: EVENT_FREQUENCIES,
  })
  @IsOptional()
  @IsIn(EVENT_FREQUENCIES)
  frequency?: EventFrequency;

  @ApiPropertyOptional({
    description: 'Anchor start datetime. For single events this is the event date.',
    type: String,
    format: 'date-time',
  })
  @IsOptional()
  @IsISO8601()
  startDate?: string;

  @ApiPropertyOptional({
    description:
      'IANA timezone the event is presented in (e.g. `Europe/Copenhagen`). Datetimes stay stored in UTC; this only controls presentation.',
    example: 'Europe/Copenhagen',
    maxLength: 64,
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;

  @ApiPropertyOptional({
    description: 'Recurrence rule. Provide when the event is (or becomes) recurring.',
    type: () => RecurrenceDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => RecurrenceDto)
  recurrence?: RecurrenceDto;
}
