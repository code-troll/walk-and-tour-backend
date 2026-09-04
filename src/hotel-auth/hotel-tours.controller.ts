import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { HotelToursService } from '../hotels/hotel-tours.service';
import {
  ErrorResponseDto,
  HotelTourDetailResponseDto,
} from '../swagger/swagger.models';
import { AuthenticatedHotelUser } from './authenticated-hotel-user.interface';
import { CurrentHotelUser } from './decorators/current-hotel-user.decorator';
import { HotelJwtAuthGuard } from './guards/hotel-jwt-auth.guard';

/**
 * Granted tours, as the hotel sees them.
 *
 * The hotel comes from the token, never from the path. The tour id in the path
 * is only ever a filter on top of it, so asking for a tour granted to somebody
 * else is a 404 rather than a 403 — a 403 would confirm the tour exists.
 */
@ApiTags('Hotel Portal')
@ApiBearerAuth('hotel-auth')
@Controller('hotel/tours')
@UseGuards(HotelJwtAuthGuard)
export class HotelToursPortalController {
  constructor(private readonly toursService: HotelToursService) {}

  @ApiOperation({
    summary: 'Read one granted tour',
    description:
      'Returns a tour this hotel has been granted, with the price this partner ' +
      'is charged and the content needed to describe it to a guest: what the ' +
      'tour is, its itinerary, and what is and is not included. Publication to ' +
      'the public site is not required — the grant is the authorisation.',
  })
  @ApiOkResponse({ description: 'The granted tour.', type: HotelTourDetailResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({
    description: 'No live grant for this tour and this hotel.',
    type: ErrorResponseDto,
  })
  @ApiOperation({
    summary: 'List every tour this hotel may sell',
    description:
      'Returns all live grants in full, so the portal can search them by ' +
      'itinerary stop, highlight, tag or start point without a request per ' +
      'keystroke. A hotel holds a handful of grants; the whole set is a few ' +
      'kilobytes.',
  })
  @ApiOkResponse({
    description: 'The granted tours.',
    type: [HotelTourDetailResponseDto],
  })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @Get()
  findAll(@CurrentHotelUser() hotelUser: AuthenticatedHotelUser) {
    return this.toursService.listGranted(hotelUser.hotelId);
  }

  @Get(':tourId')
  findOne(
    @CurrentHotelUser() hotelUser: AuthenticatedHotelUser,
    @Param('tourId', ParseUUIDPipe) tourId: string,
  ) {
    return this.toursService.findGranted(hotelUser.hotelId, tourId);
  }
}
