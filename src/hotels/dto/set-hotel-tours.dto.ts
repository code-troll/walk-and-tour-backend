import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsOptional,
  IsUUID,
  Matches,
  ValidateNested,
} from 'class-validator';

export class HotelTourGrantInputDto {
  @ApiProperty({
    description: 'Identifier of a tour this hotel may sell.',
    format: 'uuid',
    example: '0f7b8a2c-5d3e-4a1b-9c8d-2e4f6a8b0c1d',
  })
  @IsUUID('4')
  tourId!: string;

  @ApiPropertyOptional({
    description:
      "Price per person for this partner, in the tour's own currency. Omit it, " +
      "or send null, to charge the tour's own price — which is not the same as " +
      'copying that price, because the partner then follows it when the tour is ' +
      'repriced.',
    example: '199.00',
    nullable: true,
  })
  @IsOptional()
  // A decimal string rather than a number: money never passes through a float
  // in this codebase, and `numeric` comes back from the driver as a string.
  @Matches(/^\d{1,8}(\.\d{1,2})?$/, {
    message: 'priceAmount must be a positive amount with at most two decimals.',
  })
  priceAmount?: string | null;
}

export class SetHotelToursDto {
  @ApiProperty({
    description:
      'The complete set of tours this hotel may sell, each with an optional ' +
      'partner price. Tours missing from the list have their grant revoked; ' +
      'tours already granted keep their grant and take the price sent here.',
    type: [HotelTourGrantInputDto],
  })
  @IsArray()
  @ArrayUnique((grant: HotelTourGrantInputDto) => grant.tourId)
  @ValidateNested({ each: true })
  @Type(() => HotelTourGrantInputDto)
  tours!: HotelTourGrantInputDto[];
}
