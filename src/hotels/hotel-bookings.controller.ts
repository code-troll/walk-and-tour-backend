import {
  Body,
  Controller,
  Delete,
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
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { AdminRoles } from '../admin-auth/decorators/admin-roles.decorator';
import { CurrentAdmin } from '../admin-auth/decorators/current-admin.decorator';
import { AuthenticatedAdmin } from '../admin-auth/authenticated-admin.interface';
import { AdminJwtAuthGuard } from '../admin-auth/guards/admin-jwt-auth.guard';
import { AdminRolesGuard } from '../admin-auth/guards/admin-roles.guard';
import {
  ErrorResponseDto,
  HotelBookingListResponseDto,
  HotelBookingResponseDto,
} from '../swagger/swagger.models';
import { AddHotelBookingLineItemDto } from './dto/add-hotel-booking-line-item.dto';
import { HotelBookingActionDto } from './dto/hotel-booking-action.dto';
import { ListAdminHotelBookingsDto } from './dto/list-hotel-bookings.dto';
import { BookingActor, HotelBookingsService } from './hotel-bookings.service';

/**
 * Bookings as Walk and Tour sees them.
 *
 * Operating bookings is `super_admin` and `editor`; `marketing` is excluded, as
 * it is from tours and events.
 */
@ApiTags('Admin Hotel Bookings')
@ApiBearerAuth('admin-auth')
@Controller('admin/hotel-bookings')
@UseGuards(AdminJwtAuthGuard, AdminRolesGuard)
@AdminRoles('super_admin', 'editor')
export class HotelBookingsController {
  constructor(private readonly bookingsService: HotelBookingsService) {}

  private static actorFor(admin: AuthenticatedAdmin): BookingActor {
    return { type: 'admin', label: admin.email, adminUserId: admin.id };
  }

  @ApiOperation({
    summary: 'List hotel bookings',
    description: 'Returns bookings across all hotels, filterable by hotel and status.',
  })
  @ApiOkResponse({ description: 'Paginated bookings.', type: HotelBookingListResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @Get()
  findAll(@Query() query: ListAdminHotelBookingsDto) {
    return this.bookingsService.findAll(query);
  }

  @ApiOperation({
    summary: 'Get one hotel booking',
    description: 'Returns a booking with its priced lines and full history.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'The booking.', type: HotelBookingResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @Get(':id')
  async findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.bookingsService.toView(await this.bookingsService.findOneOrThrow(id));
  }

  @ApiOperation({
    summary: 'Confirm a booking',
    description: 'Accepts a pending booking. Only possible from `pending`.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: HotelBookingResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @Post(':id/confirm')
  async confirm(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.bookingsService.toView(
      await this.bookingsService.changeStatus({
        id,
        to: 'confirmed',
        actor: HotelBookingsController.actorFor(admin),
      }),
    );
  }

  @ApiOperation({
    summary: 'Mark a booking as completed',
    description: 'Records that the tour ran. Only possible from `confirmed`.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: HotelBookingResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @Post(':id/complete')
  async complete(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.bookingsService.toView(
      await this.bookingsService.changeStatus({
        id,
        to: 'completed',
        actor: HotelBookingsController.actorFor(admin),
      }),
    );
  }

  @ApiOperation({
    summary: 'Cancel a booking',
    description: 'Cancels a booking that has not been invoiced.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: HotelBookingResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @Post(':id/cancel')
  async cancel(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: HotelBookingActionDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.bookingsService.toView(
      await this.bookingsService.changeStatus({
        id,
        to: 'cancelled',
        reason: dto.reason ?? null,
        actor: HotelBookingsController.actorFor(admin),
      }),
    );
  }

  @ApiOperation({
    summary: 'Mark a booking as invoiced',
    description:
      'Records that the hotel has been billed. This freezes the amounts: no line item can be added or removed afterwards, and the total stops being an estimate.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: HotelBookingResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @Post(':id/invoice')
  async invoice(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.bookingsService.toView(
      await this.bookingsService.changeStatus({
        id,
        to: 'invoiced',
        actor: HotelBookingsController.actorFor(admin),
      }),
    );
  }

  @ApiOperation({
    summary: 'Add a priced line to a booking',
    description:
      'Adds a charge for something specific to this hotel or this booking. Amounts exclude VAT, and a negative amount is a discount. Refused once the booking is invoiced or cancelled.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: HotelBookingResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @Post(':id/line-items')
  async addLineItem(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: AddHotelBookingLineItemDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.bookingsService.toView(
      await this.bookingsService.addLineItem({
        id,
        description: dto.description,
        amount: dto.amount,
        actor: HotelBookingsController.actorFor(admin),
      }),
    );
  }

  @ApiOperation({
    summary: 'Remove a priced line',
    description:
      'Removes an added charge. The tour line itself cannot be removed — cancel the booking instead.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiParam({ name: 'lineItemId', format: 'uuid' })
  @ApiOkResponse({ type: HotelBookingResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @Delete(':id/line-items/:lineItemId')
  async removeLineItem(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('lineItemId', new ParseUUIDPipe()) lineItemId: string,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.bookingsService.toView(
      await this.bookingsService.removeLineItem({
        id,
        lineItemId,
        actor: HotelBookingsController.actorFor(admin),
      }),
    );
  }
}
