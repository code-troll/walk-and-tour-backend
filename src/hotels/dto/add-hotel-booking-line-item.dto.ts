import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

/** Two decimal places, optionally negative, which is how a discount is written. */
const AMOUNT_PATTERN = /^-?\d{1,8}(\.\d{1,2})?$/;

export class AddHotelBookingLineItemDto {
  @ApiProperty({
    description: 'What the hotel is being charged for.',
    example: 'Private guide surcharge',
    maxLength: 200,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  description!: string;

  @ApiProperty({
    description:
      'Amount in the booking currency, excluding VAT. Negative values are discounts.',
    example: '150.50',
    pattern: AMOUNT_PATTERN.source,
  })
  @IsString()
  @Matches(AMOUNT_PATTERN)
  amount!: string;
}
