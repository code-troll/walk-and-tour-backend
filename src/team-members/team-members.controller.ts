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
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { AdminRoles } from '../admin-auth/decorators/admin-roles.decorator';
import { CurrentAdmin } from '../admin-auth/decorators/current-admin.decorator';
import { AuthenticatedAdmin } from '../admin-auth/authenticated-admin.interface';
import { AdminJwtAuthGuard } from '../admin-auth/guards/admin-jwt-auth.guard';
import { AdminRolesGuard } from '../admin-auth/guards/admin-roles.guard';
import { LocaleQueryDto } from '../shared/dto/locale-query.dto';
import { ErrorResponseDto } from '../swagger/swagger.models';
import { CreateTeamMemberDto } from './dto/create-team-member.dto';
import { SetTeamMemberPhotoDto } from './dto/team-member-photo.dto';
import {
  CreateTeamMemberTranslationDto,
  UpdateTeamMemberTranslationDto,
} from './dto/team-member-translation.dto';
import { UpdateTeamMemberDto } from './dto/update-team-member.dto';
import { PublicTeamMembersService } from './public-team-members.service';
import { TeamMembersService } from './team-members.service';

@Controller()
export class TeamMembersController {
  constructor(
    private readonly teamMembersService: TeamMembersService,
    private readonly publicTeamMembersService: PublicTeamMembersService,
  ) {}

  // ── Admin endpoints ──────────────────────────────────────────────

  @ApiTags('Admin Team Members')
  @ApiBearerAuth('admin-auth')
  @ApiOperation({
    summary: 'List team members for admin management',
    description: 'Returns all team members with translations and audit metadata, ordered by display index.',
  })
  @ApiOkResponse({ description: 'Admin team member records.' })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @Get('admin/team-members')
  @UseGuards(AdminJwtAuthGuard, AdminRolesGuard)
  @AdminRoles('super_admin', 'editor')
  findAllAdmin() {
    return this.teamMembersService.findAll();
  }

  @ApiTags('Admin Team Members')
  @ApiBearerAuth('admin-auth')
  @ApiOperation({
    summary: 'Get a team member by UUID',
    description: 'Returns the full admin representation of a single team member.',
  })
  @ApiParam({ name: 'id', description: 'Team member UUID.', format: 'uuid' })
  @ApiOkResponse({ description: 'Admin team member record.' })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @Get('admin/team-members/:id')
  @UseGuards(AdminJwtAuthGuard, AdminRolesGuard)
  @AdminRoles('super_admin', 'editor')
  findOneAdmin(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.teamMembersService.findOne(id);
  }

  @ApiTags('Admin Team Members')
  @ApiBearerAuth('admin-auth')
  @ApiOperation({
    summary: 'Create a team member',
    description: 'Creates a new team member. Translations and photo are added through nested routes.',
  })
  @ApiCreatedResponse({ description: 'Created admin team member record.' })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @Post('admin/team-members')
  @UseGuards(AdminJwtAuthGuard, AdminRolesGuard)
  @AdminRoles('super_admin', 'editor')
  createAdmin(
    @Body() dto: CreateTeamMemberDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.teamMembersService.create(dto, admin);
  }

  @ApiTags('Admin Team Members')
  @ApiBearerAuth('admin-auth')
  @ApiOperation({
    summary: 'Update a team member',
    description: 'Updates shared team member fields (order, LinkedIn, publication status).',
  })
  @ApiParam({ name: 'id', description: 'Team member UUID.', format: 'uuid' })
  @ApiOkResponse({ description: 'Updated admin team member record.' })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @Patch('admin/team-members/:id')
  @UseGuards(AdminJwtAuthGuard, AdminRolesGuard)
  @AdminRoles('super_admin', 'editor')
  updateAdmin(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateTeamMemberDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.teamMembersService.update(id, dto, admin);
  }

  @ApiTags('Admin Team Members')
  @ApiBearerAuth('admin-auth')
  @ApiOperation({
    summary: 'Delete a team member',
    description: 'Deletes a team member and all its translations.',
  })
  @ApiParam({ name: 'id', description: 'Team member UUID.', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Team member deleted successfully.' })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @Delete('admin/team-members/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AdminJwtAuthGuard, AdminRolesGuard)
  @AdminRoles('super_admin', 'editor')
  async removeAdmin(
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    await this.teamMembersService.remove(id);
  }

  // ── Photo media ──────────────────────────────────────────────────

  @ApiTags('Admin Team Members')
  @ApiBearerAuth('admin-auth')
  @ApiOperation({
    summary: 'Set team member photo',
    description: 'Attaches or replaces the photo media on the team member.',
  })
  @ApiParam({ name: 'id', description: 'Team member UUID.', format: 'uuid' })
  @ApiOkResponse({ description: 'Updated admin team member record.' })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @Post('admin/team-members/:id/photo')
  @UseGuards(AdminJwtAuthGuard, AdminRolesGuard)
  @AdminRoles('super_admin', 'editor')
  setPhoto(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: SetTeamMemberPhotoDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.teamMembersService.setPhoto(id, dto, admin);
  }

  @ApiTags('Admin Team Members')
  @ApiBearerAuth('admin-auth')
  @ApiOperation({
    summary: 'Clear team member photo',
    description: 'Detaches the current photo from the team member.',
  })
  @ApiParam({ name: 'id', description: 'Team member UUID.', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Photo cleared successfully.' })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @Delete('admin/team-members/:id/photo')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AdminJwtAuthGuard, AdminRolesGuard)
  @AdminRoles('super_admin', 'editor')
  async clearPhoto(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    await this.teamMembersService.clearPhoto(id, admin);
  }

  // ── Translations ─────────────────────────────────────────────────

  @ApiTags('Admin Team Members')
  @ApiBearerAuth('admin-auth')
  @ApiOperation({
    summary: 'Create a team member translation',
    description: 'Creates one localized translation for a team member.',
  })
  @ApiParam({ name: 'id', description: 'Team member UUID.', format: 'uuid' })
  @ApiCreatedResponse({ description: 'Admin team member record after translation creation.' })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @Post('admin/team-members/:id/translations')
  @UseGuards(AdminJwtAuthGuard, AdminRolesGuard)
  @AdminRoles('super_admin', 'editor')
  createTranslation(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: CreateTeamMemberTranslationDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.teamMembersService.createTranslation(id, dto, admin);
  }

  @ApiTags('Admin Team Members')
  @ApiBearerAuth('admin-auth')
  @ApiOperation({
    summary: 'Update a team member translation',
    description: 'Updates one localized translation for a team member.',
  })
  @ApiParam({ name: 'id', description: 'Team member UUID.', format: 'uuid' })
  @ApiParam({ name: 'languageCode', description: 'Locale code for the translation.', example: 'en' })
  @ApiOkResponse({ description: 'Admin team member record after translation update.' })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @Patch('admin/team-members/:id/translations/:languageCode')
  @UseGuards(AdminJwtAuthGuard, AdminRolesGuard)
  @AdminRoles('super_admin', 'editor')
  updateTranslation(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('languageCode') languageCode: string,
    @Body() dto: UpdateTeamMemberTranslationDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.teamMembersService.updateTranslation(id, languageCode, dto, admin);
  }

  @ApiTags('Admin Team Members')
  @ApiBearerAuth('admin-auth')
  @ApiOperation({
    summary: 'Delete a team member translation',
    description: 'Deletes one localized translation by locale code.',
  })
  @ApiParam({ name: 'id', description: 'Team member UUID.', format: 'uuid' })
  @ApiParam({ name: 'languageCode', description: 'Locale code for the translation.', example: 'en' })
  @ApiNoContentResponse({ description: 'Translation deleted successfully.' })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @Delete('admin/team-members/:id/translations/:languageCode')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AdminJwtAuthGuard, AdminRolesGuard)
  @AdminRoles('super_admin', 'editor')
  async deleteTranslation(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('languageCode') languageCode: string,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    await this.teamMembersService.deleteTranslation(id, languageCode, admin);
  }

  // ── Public endpoints ─────────────────────────────────────────────

  @ApiTags('Public Team Members')
  @ApiOperation({
    summary: 'List published team members by locale',
    description: 'Returns published team members that have a translation for the requested locale, ordered by display index.',
  })
  @ApiQuery({ name: 'locale', description: 'Requested locale code.', example: 'en' })
  @ApiOkResponse({ description: 'Published localized team members.' })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @Get('public/team-members')
  findAllPublic(@Query() query: LocaleQueryDto) {
    return this.publicTeamMembersService.findAll(query.locale);
  }
}
