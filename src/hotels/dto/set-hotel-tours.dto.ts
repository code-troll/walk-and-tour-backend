import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayUnique, IsArray, IsUUID } from 'class-validator';

export class SetHotelToursDto {
  @ApiProperty({
    description:
      'The complete set of tours this hotel may sell. Tours missing from the list have their grant revoked, tours already granted are left untouched, and the rest are granted.',
    type: [String],
    format: 'uuid',
    example: ['0f7b8a2c-5d3e-4a1b-9c8d-2e4f6a8b0c1d'],
  })
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  @Type(() => String)
  tourIds!: string[];
}
