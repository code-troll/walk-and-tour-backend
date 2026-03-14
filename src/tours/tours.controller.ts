import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
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
  ApiNoContentResponse,
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
import {
  ErrorResponseDto,
  TourAdminResponseDto,
  TourMediaListResponseDto,
} from '../swagger/swagger.models';
import { CreateTourDto } from './dto/create-tour.dto';
import {
  AttachTourMediaDto,
  SetTourCoverMediaDto,
  UpdateTourMediaDto,
} from './dto/tour-media.dto';
import {
  CreateTourTranslationDto,
  PublishTourTranslationDto,
  UpdateTourTranslationDto,
} from './dto/tour-translation.dto';
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
    description:
      'Creates a minimal draft tour with only the shared identifier fields. Shared content, schema, media, itinerary, tags, and translations are added later through PATCH.',
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
      'Updates only shared tour data. It fully replaces the shared itinerary when provided and recalculates readiness for existing translations that depend on shared schema or stop structure.',
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

  @ApiOperation({
    summary: 'List attached tour media',
    description: 'Returns only the media assets currently attached to the tour.',
  })
  @ApiParam({
    name: 'id',
    description: 'Tour UUID.',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Attached tour media items.',
    type: TourMediaListResponseDto,
  })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @Get(':id/media')
  listMedia(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.toursService.listMedia(id);
  }

  @ApiOperation({
    summary: 'Attach media to a tour',
    description: 'Attaches one existing media asset to the tour with optional localized alt text and order.',
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
  @Post(':id/media')
  attachMedia(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: AttachTourMediaDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.toursService.attachMedia(id, dto, admin);
  }

  @ApiOperation({
    summary: 'Update tour media metadata',
    description: 'Updates only the per-tour metadata for one attached media asset.',
  })
  @ApiParam({
    name: 'id',
    description: 'Tour UUID.',
    format: 'uuid',
  })
  @ApiParam({
    name: 'mediaId',
    description: 'Attached media asset UUID.',
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
  @Patch(':id/media/:mediaId')
  updateMedia(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('mediaId', new ParseUUIDPipe()) mediaId: string,
    @Body() dto: UpdateTourMediaDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.toursService.updateMedia(id, mediaId, dto, admin);
  }

  @ApiOperation({
    summary: 'Detach media from a tour',
    description: 'Removes one media attachment from the tour and clears the cover if necessary.',
  })
  @ApiParam({
    name: 'id',
    description: 'Tour UUID.',
    format: 'uuid',
  })
  @ApiParam({
    name: 'mediaId',
    description: 'Attached media asset UUID.',
    format: 'uuid',
  })
  @ApiNoContentResponse({
    description: 'Media detached successfully.',
  })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id/media/:mediaId')
  async detachMedia(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('mediaId', new ParseUUIDPipe()) mediaId: string,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    await this.toursService.detachMedia(id, mediaId, admin);
  }

  @ApiOperation({
    summary: 'Set tour cover media',
    description: 'Marks one attached image asset as the tour cover.',
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
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @Post(':id/cover-media')
  setCoverMedia(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: SetTourCoverMediaDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.toursService.setCoverMedia(id, dto, admin);
  }

  @ApiOperation({
    summary: 'Clear tour cover media',
    description: 'Removes the current cover media assignment from the tour.',
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
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @Delete(':id/cover-media')
  clearCoverMedia(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.toursService.clearCoverMedia(id, admin);
  }

  @ApiOperation({
    summary: 'Create a tour translation',
    description:
      'Creates a localized tour translation independently from the shared tour record. The backend calculates readiness and keeps the translation unpublished until the dedicated publish endpoint is called.',
  })
  @ApiParam({
    name: 'id',
    description: 'Tour UUID.',
    format: 'uuid',
  })
  @ApiCreatedResponse({
    description: 'Admin tour record after translation creation.',
    type: TourAdminResponseDto,
  })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @Post(':id/translations')
  createTranslation(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: CreateTourTranslationDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.toursService.createTranslation(id, dto, admin);
  }

  @ApiOperation({
    summary: 'Update a tour translation',
    description:
      'Updates one localized tour translation independently from shared tour data. Any readiness recalculation that fails will automatically unpublish that translation.',
  })
  @ApiParam({
    name: 'id',
    description: 'Tour UUID.',
    format: 'uuid',
  })
  @ApiParam({
    name: 'languageCode',
    description: 'Translation locale code.',
    example: 'en',
  })
  @ApiOkResponse({
    description: 'Admin tour record after translation update.',
    type: TourAdminResponseDto,
  })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @Patch(':id/translations/:languageCode')
  updateTranslation(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('languageCode') languageCode: string,
    @Body() dto: UpdateTourTranslationDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.toursService.updateTranslation(id, languageCode, dto, admin);
  }

  @ApiOperation({
    summary: 'Publish a tour translation',
    description:
      'Publishes one localized tour translation. This endpoint is the only place where translation publication can be enabled, and it rejects translations that are not ready.',
  })
  @ApiParam({
    name: 'id',
    description: 'Tour UUID.',
    format: 'uuid',
  })
  @ApiParam({
    name: 'languageCode',
    description: 'Translation locale code.',
    example: 'en',
  })
  @ApiOkResponse({
    description: 'Admin tour record after translation publication.',
    type: TourAdminResponseDto,
  })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @Post(':id/translations/:languageCode/publish')
  publishTranslation(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('languageCode') languageCode: string,
    @Body() dto: PublishTourTranslationDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.toursService.publishTranslation(id, languageCode, dto, admin);
  }

  @ApiOperation({
    summary: 'Unpublish a tour translation',
    description:
      'Unpublishes one localized tour translation. This endpoint is the only place where translation publication can be disabled manually.',
  })
  @ApiParam({
    name: 'id',
    description: 'Tour UUID.',
    format: 'uuid',
  })
  @ApiParam({
    name: 'languageCode',
    description: 'Translation locale code.',
    example: 'en',
  })
  @ApiOkResponse({
    description: 'Admin tour record after translation unpublication.',
    type: TourAdminResponseDto,
  })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @Post(':id/translations/:languageCode/unpublish')
  unpublishTranslation(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('languageCode') languageCode: string,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.toursService.unpublishTranslation(id, languageCode, admin);
  }

  @ApiOperation({
    summary: 'Delete a tour translation',
    description:
      'Deletes one localized tour translation by locale code. This permanently removes the locale from the tour.',
  })
  @ApiParam({
    name: 'id',
    description: 'Tour UUID.',
    format: 'uuid',
  })
  @ApiParam({
    name: 'languageCode',
    description: 'Translation locale code.',
    example: 'en',
  })
  @ApiNoContentResponse({
    description: 'Translation deleted successfully.',
  })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id/translations/:languageCode')
  async deleteTranslation(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('languageCode') languageCode: string,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    await this.toursService.deleteTranslation(id, languageCode, admin);
  }
}
