import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const LOCALE_PATTERN = /^[a-z]{2}(?:-[A-Z]{2})?$/;
const PHONE_PATTERN = /^[+()\d][\s()+\-.\d]*$/;
const MAX_PARTICIPANTS = 200;

/**
 * Note there is no `hotelId`. The hotel a booking belongs to is taken from the
 * signed-in access user and never from the request, so one hotel cannot book on
 * another's behalf by editing a payload.
 */
export class CreateHotelBookingDto {
  @ApiProperty({
    description: 'Tour to book. Must be granted to the signed-in hotel.',
    format: 'uuid',
  })
  @IsUUID('4')
  tourId!: string;

  @ApiProperty({
    description: 'When the tour should run, as an ISO 8601 instant.',
    example: '2026-10-01T09:00:00.000Z',
  })
  @IsDateString()
  scheduledFor!: string;

  @ApiProperty({
    description: 'Language the tour should be given in.',
    example: 'en',
    pattern: LOCALE_PATTERN.source,
  })
  @IsString()
  @Matches(LOCALE_PATTERN)
  languageCode!: string;

  @ApiProperty({
    description: 'Number of guests taking part.',
    example: 2,
    minimum: 1,
    maximum: MAX_PARTICIPANTS,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  participantCount!: number;

  @ApiProperty({
    description: 'Name of the guest the booking is for.',
    example: 'Anders Jensen',
    maxLength: 200,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  guestName!: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Guest email address, if the hotel wants to share it.',
    example: 'guest@example.com',
    nullable: true,
  })
  @IsEmail()
  @MaxLength(320)
  @IsOptional()
  guestEmail?: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Guest telephone number.',
    example: '+45 20 11 22 33',
    nullable: true,
  })
  @IsString()
  @Matches(PHONE_PATTERN)
  @MaxLength(50)
  @IsOptional()
  guestPhone?: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Room the guest is staying in, to help the guide find them.',
    example: '412',
    nullable: true,
  })
  @IsString()
  @MaxLength(50)
  @IsOptional()
  roomNumber?: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Anything the guide should know: mobility, allergies, occasion.',
    nullable: true,
  })
  @IsString()
  @MaxLength(2000)
  @IsOptional()
  notes?: string;
}
