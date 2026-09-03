import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

import { HOTEL_STATUSES } from '../../shared/domain';

/** Danish CVR numbers are exactly eight digits. */
export const CVR_PATTERN = /^\d{8}$/;

/**
 * Accepts the ways a CVR number is written by hand — spaced digits, a `DK`
 * prefix — and reduces them to the eight digits that are actually stored, so
 * two spellings of the same company cannot both be registered.
 */
export const normalizeCvr = (value: unknown): unknown =>
  typeof value === 'string'
    ? value.replace(/\s+/g, '').replace(/^DK/i, '')
    : value;

const PHONE_PATTERN = /^[+()\d][\s()+\-.\d]*$/;

export class CreateHotelDto {
  @ApiProperty({
    description: 'Hotel name, as it should appear in the backoffice.',
    example: 'Copenhagen Admiral Hotel',
    maxLength: 200,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @ApiProperty({
    description: 'Street address of the hotel.',
    example: 'Toldbodgade 24-28, 1253 København K',
    maxLength: 500,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  address!: string;

  @ApiProperty({
    description: 'Contact telephone number.',
    example: '+45 33 74 14 14',
    maxLength: 50,
  })
  @IsString()
  @Matches(PHONE_PATTERN)
  @MinLength(5)
  @MaxLength(50)
  phone!: string;

  @ApiProperty({
    description:
      'Contact email address for the hotel. This is not the sign-in address of the hotel access user, which is registered separately.',
    example: 'reception@example.com',
    maxLength: 320,
  })
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @ApiProperty({
    description:
      'Danish company registration number. Spaces and a leading `DK` are accepted and removed before storing.',
    example: '12345678',
    pattern: CVR_PATTERN.source,
  })
  @Transform(({ value }) => normalizeCvr(value))
  @IsString()
  @Matches(CVR_PATTERN)
  cvr!: string;

  @ApiPropertyOptional({
    description: 'Initial status. Defaults to `active` when omitted.',
    enum: HOTEL_STATUSES,
    example: 'active',
    default: 'active',
  })
  @IsString()
  @IsIn(HOTEL_STATUSES)
  @IsOptional()
  status?: string;
}
