import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { CreateHotelBookingDto } from '../hotels/dto/create-hotel-booking.dto';
import { HotelBookingActionDto } from '../hotels/dto/hotel-booking-action.dto';
import { ListHotelBookingsDto } from '../hotels/dto/list-hotel-bookings.dto';
import { HotelBookingsService } from '../hotels/hotel-bookings.service';
import {
  ErrorResponseDto,
  HotelBookingListResponseDto,
  HotelBookingResponseDto,
} from '../swagger/swagger.models';
import { AuthenticatedHotelUser } from './authenticated-hotel-user.interface';
import { CurrentHotelUser } from './decorators/current-hotel-user.decorator';
import { HotelJwtAuthGuard } from './guards/hotel-jwt-auth.guard';

/**
 * Bookings as the hotel sees them.
 *
 * Every route derives its hotel from the token. No identifier is accepted from
 * a body or a query string, so there is no request a hotel can make that reads
 * or touches another hotel's bookings.
 */
@ApiTags('Hotel Portal')
@ApiBearerAuth('hotel-auth')
@Controller('hotel/bookings')
@UseGuards(HotelJwtAuthGuard)
export class HotelBookingsPortalController {
  constructor(private readonly bookingsService: HotelBookingsService) {}

  @ApiOperation({
    summary: 'List this hotel’s bookings',
    description: 'Returns the signed-in hotel’s bookings, most recent first.',
  })
  @ApiOkResponse({ description: 'Paginated bookings.', type: HotelBookingListResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @Get()
  findAll(
    @CurrentHotelUser() hotelUser: AuthenticatedHotelUser,
    @Query() query: ListHotelBookingsDto,
  ) {
    return this.bookingsService.findAll({
      hotelId: hotelUser.hotelId,
      status: query.status,
      page: query.page,
      limit: query.limit,
    });
  }

  @ApiOperation({
    summary: 'Get one booking',
    description:
      'Returns one of this hotel’s bookings with its priced lines and full history. A booking belonging to another hotel is reported as not found.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'The booking.', type: HotelBookingResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @Get(':id')
  async findOne(
    @CurrentHotelUser() hotelUser: AuthenticatedHotelUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.bookingsService.toView(
      await this.bookingsService.findOneOrThrow(id, hotelUser.hotelId),
    );
  }

  @ApiOperation({
    summary: 'Book a tour',
    description:
      'Creates a booking for one of the tours granted to this hotel. It opens as `pending` until Walk and Tour confirms it, and the total is an estimate until it is invoiced.',
  })
  @ApiCreatedResponse({ description: 'The created booking.', type: HotelBookingResponseDto })
  @ApiForbiddenResponse({
    description: 'The tour is not granted to this hotel.',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @Post()
  async create(
    @CurrentHotelUser() hotelUser: AuthenticatedHotelUser,
    @Body() dto: CreateHotelBookingDto,
  ) {
    return this.bookingsService.toView(
      await this.bookingsService.create(
        hotelUser.hotelId,
        {
          tourId: dto.tourId,
          scheduledFor: new Date(dto.scheduledFor),
          languageCode: dto.languageCode,
          participantCount: dto.participantCount,
          guestName: dto.guestName,
          guestEmail: dto.guestEmail ?? null,
          guestPhone: dto.guestPhone ?? null,
          roomNumber: dto.roomNumber ?? null,
          notes: dto.notes ?? null,
        },
        {
          type: 'hotel',
          label: hotelUser.hotelName,
          hotelUserId: hotelUser.id,
        },
      ),
    );
  }

  @ApiOperation({
    summary: 'Cancel a booking',
    description:
      'Cancels one of this hotel’s bookings. Only possible while it is pending or confirmed; a booking that has already run can only be cancelled by Walk and Tour.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'The cancelled booking.', type: HotelBookingResponseDto })
  @ApiConflictResponse({
    description: 'The booking cannot be cancelled from its current status.',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @Post(':id/cancel')
  async cancel(
    @CurrentHotelUser() hotelUser: AuthenticatedHotelUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: HotelBookingActionDto,
  ) {
    return this.bookingsService.toView(
      await this.bookingsService.changeStatus({
        id,
        to: 'cancelled',
        hotelId: hotelUser.hotelId,
        reason: dto.reason ?? null,
        actor: {
          type: 'hotel',
          label: hotelUser.hotelName,
          hotelUserId: hotelUser.id,
        },
      }),
    );
  }
}
