import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, MaxLength } from 'class-validator';

export class CreateHotelUserDto {
  @ApiPropertyOptional({
    description:
      "The address this hotel signs in with. Defaults to the hotel's contact " +
      'email, which is right most of the time and impossible the rest: the ' +
      'identity provider enforces one account per address, so two hotels sharing ' +
      'a reception mailbox — or one address already used by anything else — left ' +
      'the second hotel with no way to get an access user at all. Giving a ' +
      'different address here is that way.',
    example: 'reception+walkandtour@hotel.dk',
    format: 'email',
  })
  @IsOptional()
  @IsEmail()
  @MaxLength(320)
  email?: string;
}
