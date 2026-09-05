import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
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
  HotelListResponseDto,
  HotelResponseDto,
  HotelUserResponseDto,
} from '../swagger/swagger.models';
import { CreateHotelDto } from './dto/create-hotel.dto';
import { ListHotelsDto } from './dto/list-hotels.dto';
import { CreateHotelUserDto } from './dto/create-hotel-user.dto';
import { SetHotelToursDto } from './dto/set-hotel-tours.dto';
import { UpdateHotelDto } from './dto/update-hotel.dto';
import { HotelUsersService } from './hotel-users.service';
import { HotelsService } from './hotels.service';

@ApiTags('Admin Hotels')
@ApiBearerAuth('admin-auth')
@Controller('admin/hotels')
@UseGuards(AdminJwtAuthGuard, AdminRolesGuard)
@AdminRoles('super_admin')
export class HotelsController {
  constructor(
    private readonly hotelsService: HotelsService,
    private readonly hotelUsersService: HotelUsersService,
  ) {}

  @ApiOperation({
    summary: 'List hotels',
    description:
      'Returns registered hotels ordered by name, with the number of tours each one may currently sell.',
  })
  @ApiOkResponse({ description: 'Paginated hotels.', type: HotelListResponseDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @Get()
  findAll(@Query() query: ListHotelsDto) {
    return this.hotelsService.findAll(query);
  }

  @ApiOperation({
    summary: 'Get a hotel',
    description: 'Returns one hotel with the tours it may currently sell.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'Hotel record.', type: HotelResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.hotelsService.findOneOrThrow(id);
  }

  @ApiOperation({
    summary: 'Register a hotel',
    description:
      'Creates a hotel. Tours are granted separately through `PUT /api/admin/hotels/{id}/tours`.',
  })
  @ApiCreatedResponse({ description: 'Created hotel.', type: HotelResponseDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({
    description: 'Another hotel is already registered with this CVR number.',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @Post()
  create(@Body() dto: CreateHotelDto, @CurrentAdmin() admin: AuthenticatedAdmin) {
    return this.hotelsService.create(dto, admin);
  }

  @ApiOperation({
    summary: 'Update a hotel',
    description: 'Updates hotel details or its lifecycle status.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'Updated hotel.', type: HotelResponseDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({
    description: 'Another hotel is already registered with this CVR number.',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateHotelDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.hotelsService.update(id, dto, admin);
  }

  @ApiOperation({
    summary: 'Replace the tours a hotel may sell',
    description:
      'Sets the complete list of granted tours. Grants that remain keep their original grant date, tours that drop out are revoked rather than deleted, and revoked grants stay on record.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'Hotel with its updated grants.', type: HotelResponseDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({
    description: 'The hotel or one of the requested tours was not found.',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @Put(':id/tours')
  setTours(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: SetHotelToursDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.hotelsService.setTours(id, dto, admin);
  }

  @ApiOperation({
    summary: 'Get the hotel access user',
    description:
      'Returns the single access user this hotel signs in with. Responds `404` when the hotel has no access user yet, which is the state every hotel starts in.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'The access user.', type: HotelUserResponseDto })
  @ApiNotFoundResponse({
    description: 'The hotel was not found, or it has no access user yet.',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @Get(':id/user')
  findUser(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.hotelUsersService.findByHotelIdOrThrow(id);
  }

  @ApiOperation({
    summary: 'Create the hotel access user',
    description:
      'Derives a unique username from the hotel name, creates the sign-in identity, and emails the hotel a link to choose its own password. A hotel has exactly one access user.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiCreatedResponse({ description: 'The created access user.', type: HotelUserResponseDto })
  @ApiConflictResponse({
    description:
      'The hotel already has an access user, or the identity provider refused the derived username or email.',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @Post(':id/user')
  createUser(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: CreateHotelUserDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.hotelUsersService.create(id, admin, dto);
  }

  @ApiOperation({
    summary: 'Release the hotel access user',
    description:
      'Deletes the sign-in identity and the local record, freeing the address ' +
      'and the username for another hotel. The hotel and its bookings are ' +
      'untouched, and a new access user can be created straight away. This is ' +
      'irreversible: the identity is gone, not blocked.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiNoContentResponse({ description: 'The access user was released.' })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @HttpCode(204)
  @Delete(':id/user')
  async releaseUser(@Param('id', new ParseUUIDPipe()) id: string) {
    await this.hotelUsersService.release(id);
  }

  @ApiOperation({
    summary: 'Archive the hotel',
    description:
      'Ends the partnership without losing its history. Releases the access ' +
      'user and the CVR, revokes the live tour grants, and keeps every booking. ' +
      'Use this rather than deleting whenever the hotel has ever booked.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'The archived hotel.', type: HotelResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @Post(':id/archive')
  archive(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.hotelsService.archive(id, admin);
  }

  @ApiOperation({
    summary: 'Delete a hotel that has never booked',
    description:
      'Removes the hotel, its access user and its tour grants. Refused when the ' +
      'hotel holds any booking — archive it instead, which keeps them.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiNoContentResponse({ description: 'The hotel was deleted.' })
  @ApiConflictResponse({
    description: 'The hotel has bookings and must be archived instead.',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @HttpCode(204)
  @Delete(':id')
  async remove(@Param('id', new ParseUUIDPipe()) id: string) {
    await this.hotelsService.remove(id);
  }

  @ApiOperation({
    summary: 'Send a new password link',
    description:
      'Issues a fresh password setup ticket and emails it to the address the access user signs in with. Used both for a lost invitation and for a password reset.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'The access user.', type: HotelUserResponseDto })
  @ApiConflictResponse({
    description: 'The access user is disabled.',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @Post(':id/user/resend-invitation')
  resendUserInvitation(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.hotelUsersService.resendInvitation(id, admin);
  }

  @ApiOperation({
    summary: 'Disable the hotel access user',
    description: 'Blocks the sign-in identity. Reversible through the enable route.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'The access user.', type: HotelUserResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @Post(':id/user/disable')
  disableUser(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.hotelUsersService.setEnabled(id, false, admin);
  }

  @ApiOperation({
    summary: 'Enable the hotel access user',
    description:
      'Unblocks the sign-in identity. A user that has never signed in returns to `invited` rather than `active`.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'The access user.', type: HotelUserResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @Post(':id/user/enable')
  enableUser(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.hotelUsersService.setEnabled(id, true, admin);
  }
}
