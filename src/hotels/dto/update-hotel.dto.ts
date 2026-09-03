import { ApiPropertyOptional } from '@nestjs/swagger';
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
import { CVR_PATTERN, normalizeCvr } from './create-hotel.dto';

const PHONE_PATTERN = /^[+()\d][\s()+\-.\d]*$/;

export class UpdateHotelDto {
  @ApiPropertyOptional({
    description: 'Hotel name, as it should appear in the backoffice.',
    example: 'Copenhagen Admiral Hotel',
    maxLength: 200,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'Street address of the hotel.',
    example: 'Toldbodgade 24-28, 1253 København K',
    maxLength: 500,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({
    description: 'Contact telephone number.',
    example: '+45 33 74 14 14',
    maxLength: 50,
  })
  @IsString()
  @Matches(PHONE_PATTERN)
  @MinLength(5)
  @MaxLength(50)
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Contact email address for the hotel.',
    example: 'reception@example.com',
    maxLength: 320,
  })
  @IsEmail()
  @MaxLength(320)
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    description:
      'Danish company registration number. Spaces and a leading `DK` are accepted and removed before storing.',
    example: '12345678',
    pattern: CVR_PATTERN.source,
  })
  @Transform(({ value }) => normalizeCvr(value))
  @IsString()
  @Matches(CVR_PATTERN)
  @IsOptional()
  cvr?: string;

  @ApiPropertyOptional({
    description: 'Lifecycle status of the hotel account.',
    enum: HOTEL_STATUSES,
    example: 'disabled',
  })
  @IsString()
  @IsIn(HOTEL_STATUSES)
  @IsOptional()
  status?: string;
}
