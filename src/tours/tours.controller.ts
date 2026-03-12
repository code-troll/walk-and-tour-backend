import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
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
  ApiUnauthorizedResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AdminRoles } from '../admin-auth/decorators/admin-roles.decorator';
import { CurrentAdmin } from '../admin-auth/decorators/current-admin.decorator';
import { AuthenticatedAdmin } from '../admin-auth/authenticated-admin.interface';
import { AdminJwtAuthGuard } from '../admin-auth/guards/admin-jwt-auth.guard';
import { AdminRolesGuard } from '../admin-auth/guards/admin-roles.guard';
import { ErrorResponseDto, TourAdminResponseDto } from '../swagger/swagger.models';
import { CreateTourDto } from './dto/create-tour.dto';
import { UpdateTourDto } from './dto/update-tour.dto';
import { ToursService } from './tours.service';

@ApiTags('Admin Tours')
@ApiBearerAuth('admin-auth')
@Controller('admin/tours')
@UseGuards(AdminJwtAuthGuard, AdminRolesGuard)
@AdminRoles('super_admin', 'editor')
export class ToursController {
  constructor(private readonly toursService: ToursService) {}

  @ApiOperation({
    summary: 'List tours for admin management',
    description: 'Returns all tours with shared data, translation diagnostics, and audit metadata.',
  })
  @ApiOkResponse({
    description: 'Admin tour records.',
    type: TourAdminResponseDto,
    isArray: true,
  })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @Get()
  findAll() {
    return this.toursService.findAll();
  }

  @ApiOperation({
    summary: 'Get a tour by UUID for admin management',
    description: 'Returns the full admin representation of a single tour, including translation availability diagnostics.',
  })
  @ApiParam({
    name: 'id',
    description: 'Tour UUID.',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Admin tour record.',
    type: TourAdminResponseDto,
  })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.toursService.findOne(id);
  }

  @ApiOperation({
    summary: 'Create a tour',
    description: 'Creates a tour with shared attributes, optional stop itinerary, and optional localized translations.',
  })
  @ApiCreatedResponse({
    description: 'Created admin tour record.',
    type: TourAdminResponseDto,
  })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @Post()
  create(
    @Body() dto: CreateTourDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.toursService.create(dto, admin);
  }

  @ApiOperation({
    summary: 'Update a tour',
    description:
      'Updates shared tour data, fully replaces the shared itinerary when provided, and merges translations by locale code.',
  })
  @ApiParam({
    name: 'id',
    description: 'Tour UUID.',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Updated admin tour record.',
    type: TourAdminResponseDto,
  })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateTourDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.toursService.update(id, dto, admin);
  }
}
