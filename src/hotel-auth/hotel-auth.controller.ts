import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { ErrorResponseDto, HotelViewerResponseDto } from '../swagger/swagger.models';
import { AuthenticatedHotelUser } from './authenticated-hotel-user.interface';
import { CurrentHotelUser } from './decorators/current-hotel-user.decorator';
import { HotelAuthService } from './hotel-auth.service';
import { HotelJwtAuthGuard } from './guards/hotel-jwt-auth.guard';

@ApiTags('Hotel Portal')
@ApiBearerAuth('hotel-auth')
@Controller('hotel/auth')
@UseGuards(HotelJwtAuthGuard)
export class HotelAuthController {
  constructor(private readonly hotelAuthService: HotelAuthService) {}

  @ApiOperation({
    summary: 'Get the signed-in hotel',
    description:
      'Returns the hotel this token belongs to, its access user, and the tours it may currently sell. Everything is derived from the token; no identifier is accepted from the caller.',
  })
  @ApiOkResponse({ description: 'The signed-in hotel.', type: HotelViewerResponseDto })
  @ApiUnauthorizedResponse({
    description: 'The token is missing, invalid, or not mapped to a hotel access user.',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'The access user or the hotel account is disabled.',
    type: ErrorResponseDto,
  })
  @Get('me')
  me(@CurrentHotelUser() hotelUser: AuthenticatedHotelUser) {
    return this.hotelAuthService.getViewer(hotelUser);
  }
}
