import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
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

  @ApiOperation({
    summary: 'Fetch one image of a granted tour',
    description:
      'Streams the bytes of an image attached to a tour this hotel may sell. ' +
      'The grant is checked on every request: an image id is guessable in a way ' +
      'a booking id is not.',
  })
  @ApiOkResponse({ description: 'The image bytes.' })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({
    description: 'No live grant, or no such image on that tour.',
    type: ErrorResponseDto,
  })
  @Get(':tourId/media/:mediaId')
  async findImage(
    @CurrentHotelUser() hotelUser: AuthenticatedHotelUser,
    @Param('tourId', ParseUUIDPipe) tourId: string,
    @Param('mediaId', ParseUUIDPipe) mediaId: string,
    @Res({ passthrough: true }) response: { setHeader(name: string, value: string): void },
  ): Promise<StreamableFile> {
    const image = await this.toursService.getImageContent(
      hotelUser.hotelId,
      tourId,
      mediaId,
    );

    response.setHeader('Content-Type', image.contentType);
    response.setHeader(
      'Content-Disposition',
      `inline; filename="${image.originalFilename.replace(/"/g, '')}"`,
    );

    return new StreamableFile(image.content);
  }

  @Get(':tourId')
  findOne(
    @CurrentHotelUser() hotelUser: AuthenticatedHotelUser,
    @Param('tourId', ParseUUIDPipe) tourId: string,
  ) {
    return this.toursService.findGranted(hotelUser.hotelId, tourId);
  }
}
