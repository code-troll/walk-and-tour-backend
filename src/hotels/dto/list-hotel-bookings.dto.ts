import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

import { HOTEL_BOOKING_STATUSES } from '../../shared/domain';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

export class ListHotelBookingsDto {
  @ApiPropertyOptional({
    description: 'Restrict the results to one status.',
    enum: HOTEL_BOOKING_STATUSES,
  })
  @IsString()
  @IsIn(HOTEL_BOOKING_STATUSES)
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: 'One-based page number.', minimum: 1, default: DEFAULT_PAGE })
  @Transform(({ value }) => (value === undefined ? DEFAULT_PAGE : Number(value)))
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({
    description: 'Page size.',
    minimum: 1,
    maximum: MAX_LIMIT,
    default: DEFAULT_LIMIT,
  })
  @Transform(({ value }) => (value === undefined ? DEFAULT_LIMIT : Number(value)))
  @IsInt()
  @Min(1)
  @Max(MAX_LIMIT)
  @IsOptional()
  limit?: number;
}

/**
 * The admin listing additionally filters by hotel. The hotel-facing listing
 * deliberately has no such field: its scope comes from the token.
 */
export class ListAdminHotelBookingsDto extends ListHotelBookingsDto {
  @ApiPropertyOptional({ description: 'Restrict the results to one hotel.', format: 'uuid' })
  @IsUUID('4')
  @IsOptional()
  hotelId?: string;
}
