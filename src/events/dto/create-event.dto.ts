import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDefined,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  ValidateIf,
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

export class CreateEventDto {
  @ApiProperty({
    description: 'Language the event is conducted in.',
    example: 'en',
    pattern: LOCALE_CODE_PATTERN.source,
  })
  @IsString()
  @Matches(LOCALE_CODE_PATTERN)
  language!: string;

  @ApiProperty({
    description: 'Commercial model of the event.',
    enum: EVENT_TYPES,
  })
  @IsIn(EVENT_TYPES)
  type!: EventType;

  @ApiPropertyOptional({
    description: 'UUID of the website tour this event links to.',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  tourId?: string;

  @ApiPropertyOptional({
    description: 'Optional event description.',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({
    description: 'Duration of each occurrence in minutes.',
    example: 90,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  durationMinutes!: number;

  @ApiProperty({
    description: 'Whether the event happens once or recurs.',
    enum: EVENT_FREQUENCIES,
  })
  @IsIn(EVENT_FREQUENCIES)
  frequency!: EventFrequency;

  @ApiProperty({
    description: 'Anchor start datetime. For single events this is the event date.',
    type: String,
    format: 'date-time',
  })
  @IsISO8601()
  startDate!: string;

  @ApiPropertyOptional({
    description:
      'IANA timezone the event is presented in (e.g. `Europe/Copenhagen`). Datetimes are stored in UTC regardless; this only controls presentation. Defaults to the configured system timezone when omitted.',
    example: 'Europe/Copenhagen',
    maxLength: 64,
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;

  @ApiPropertyOptional({
    description: 'Recurrence rule. Required when `frequency` is `recurring`, ignored otherwise.',
    type: () => RecurrenceDto,
  })
  @ValidateIf((dto: CreateEventDto) => dto.frequency === 'recurring')
  @IsDefined()
  @ValidateNested()
  @Type(() => RecurrenceDto)
  recurrence?: RecurrenceDto;
}
