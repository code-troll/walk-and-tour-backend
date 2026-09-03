import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
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

import { AdminRoles } from '../admin-auth/decorators/admin-roles.decorator';
import { CurrentAdmin } from '../admin-auth/decorators/current-admin.decorator';
import { AuthenticatedAdmin } from '../admin-auth/authenticated-admin.interface';
import { AdminJwtAuthGuard } from '../admin-auth/guards/admin-jwt-auth.guard';
import { AdminRolesGuard } from '../admin-auth/guards/admin-roles.guard';
import {
  ErrorResponseDto,
  HotelListResponseDto,
  HotelResponseDto,
} from '../swagger/swagger.models';
import { CreateHotelDto } from './dto/create-hotel.dto';
import { ListHotelsDto } from './dto/list-hotels.dto';
import { SetHotelToursDto } from './dto/set-hotel-tours.dto';
import { UpdateHotelDto } from './dto/update-hotel.dto';
import { HotelsService } from './hotels.service';

@ApiTags('Admin Hotels')
@ApiBearerAuth('admin-auth')
@Controller('admin/hotels')
@UseGuards(AdminJwtAuthGuard, AdminRolesGuard)
@AdminRoles('super_admin')
export class HotelsController {
  constructor(private readonly hotelsService: HotelsService) {}

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
}
