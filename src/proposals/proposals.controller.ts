import {
  BadRequestException,
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
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { AdminRoles } from '../admin-auth/decorators/admin-roles.decorator';
import { CurrentAdmin } from '../admin-auth/decorators/current-admin.decorator';
import { AuthenticatedAdmin } from '../admin-auth/authenticated-admin.interface';
import { AdminJwtAuthGuard } from '../admin-auth/guards/admin-jwt-auth.guard';
import { AdminRolesGuard } from '../admin-auth/guards/admin-roles.guard';
import { AdminListProposalsDto } from './dto/list-proposals.dto';
import { CreateProposalDto } from './dto/create-proposal.dto';
import { CreateProposalVersionDto } from './dto/create-proposal-version.dto';
import { AttachProposalMediaDto, UpdateProposalMediaDto } from './dto/proposal-media.dto';
import { UpdateProposalDto } from './dto/update-proposal.dto';
import { UpdateProposalVersionDto } from './dto/update-proposal-version.dto';
import { getProviderConfig } from '../shared/config/provider.config';
import { ProposalsService } from './proposals.service';

@ApiTags('Admin Proposals')
@ApiBearerAuth('admin-auth')
@Controller('admin/proposals')
@UseGuards(AdminJwtAuthGuard, AdminRolesGuard)
@AdminRoles('super_admin', 'editor')
export class ProposalsController {
  constructor(private readonly proposalsService: ProposalsService) {}

  @ApiOperation({ summary: 'List proposals with optional filters' })
  @ApiOkResponse({ description: 'Filtered proposals.' })
  @Get()
  findAll(@Query() query: AdminListProposalsDto) {
    return this.proposalsService.findAll(query);
  }

  @ApiOperation({ summary: 'Get a proposal by UUID' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'Proposal record.' })
  @ApiNotFoundResponse()
  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.proposalsService.findOne(id);
  }

  @ApiOperation({ summary: 'Create a proposal' })
  @ApiCreatedResponse({ description: 'Created proposal.' })
  @Post()
  create(
    @Body() dto: CreateProposalDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.proposalsService.create(dto, admin);
  }

  @ApiOperation({ summary: 'Update a proposal' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'Updated proposal.' })
  @ApiNotFoundResponse()
  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateProposalDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.proposalsService.update(id, dto, admin);
  }

  @ApiOperation({ summary: 'Delete a proposal' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Proposal deleted.' })
  @ApiNotFoundResponse()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  async remove(@Param('id', new ParseUUIDPipe()) id: string) {
    await this.proposalsService.remove(id);
  }

  @ApiOperation({
    summary: 'Send proposal link to recipient',
    description:
      'Sends an email with the proposal link to the recipient. The proposal must be published (status "sent") and have a recipient email.',
  })
  @ApiParam({ name: 'id', description: 'Proposal UUID', format: 'uuid' })
  @ApiOkResponse({ description: 'Email sent successfully.' })
  @ApiBadRequestResponse()
  @ApiNotFoundResponse()
  @Post(':id/send')
  async sendToRecipient(@Param('id', new ParseUUIDPipe()) id: string) {
    const config = getProviderConfig();
    const publicBaseUrl = config.newsletterPublicAppBaseUrl ?? config.appBaseUrl;
    await this.proposalsService.sendToRecipient(id, publicBaseUrl);
    return { message: 'Proposal link sent to recipient.' };
  }

  // ─── Versions ──────────────────────────────────────────────

  @ApiOperation({ summary: 'Add a version to a proposal' })
  @ApiParam({ name: 'id', description: 'Proposal UUID', format: 'uuid' })
  @ApiCreatedResponse({ description: 'Proposal with new version.' })
  @ApiNotFoundResponse()
  @Post(':id/versions')
  createVersion(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: CreateProposalVersionDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.proposalsService.createVersion(id, dto, admin);
  }

  @ApiOperation({ summary: 'Update a proposal version' })
  @ApiParam({ name: 'id', description: 'Proposal UUID', format: 'uuid' })
  @ApiParam({ name: 'versionId', description: 'Version UUID', format: 'uuid' })
  @ApiOkResponse({ description: 'Proposal with updated version.' })
  @ApiNotFoundResponse()
  @Patch(':id/versions/:versionId')
  updateVersion(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('versionId', new ParseUUIDPipe()) versionId: string,
    @Body() dto: UpdateProposalVersionDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.proposalsService.updateVersion(id, versionId, dto, admin);
  }

  @ApiOperation({ summary: 'Delete a proposal version' })
  @ApiParam({ name: 'id', description: 'Proposal UUID', format: 'uuid' })
  @ApiParam({ name: 'versionId', description: 'Version UUID', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Version deleted.' })
  @ApiNotFoundResponse()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id/versions/:versionId')
  async removeVersion(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('versionId', new ParseUUIDPipe()) versionId: string,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    await this.proposalsService.removeVersion(id, versionId, admin);
  }

  // ─── Media ─────────────────────────────────────────────────

  @ApiOperation({ summary: 'Attach media to a proposal' })
  @ApiParam({ name: 'id', description: 'Proposal UUID', format: 'uuid' })
  @ApiOkResponse({ description: 'Proposal with attached media.' })
  @ApiNotFoundResponse()
  @Post(':id/media')
  attachMedia(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: AttachProposalMediaDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.proposalsService.attachMedia(id, dto, admin);
  }

  @ApiOperation({ summary: 'Update proposal media metadata' })
  @ApiParam({ name: 'id', description: 'Proposal UUID', format: 'uuid' })
  @ApiParam({ name: 'rowId', description: 'Media attachment row UUID', format: 'uuid' })
  @ApiOkResponse({ description: 'Proposal with updated media.' })
  @ApiNotFoundResponse()
  @Patch(':id/media/:rowId')
  updateMedia(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('rowId', new ParseUUIDPipe()) rowId: string,
    @Body() dto: UpdateProposalMediaDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.proposalsService.updateMedia(id, rowId, dto, admin);
  }

  @ApiOperation({ summary: 'Detach media from a proposal' })
  @ApiParam({ name: 'id', description: 'Proposal UUID', format: 'uuid' })
  @ApiParam({ name: 'rowId', description: 'Media attachment row UUID', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Media detached.' })
  @ApiNotFoundResponse()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id/media/:rowId')
  async detachMedia(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('rowId', new ParseUUIDPipe()) rowId: string,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    await this.proposalsService.detachMedia(id, rowId, admin);
  }
}
