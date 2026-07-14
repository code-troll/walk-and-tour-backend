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

import { AuthenticatedAdmin } from '../admin-auth/authenticated-admin.interface';
import { AdminRoles } from '../admin-auth/decorators/admin-roles.decorator';
import { CurrentAdmin } from '../admin-auth/decorators/current-admin.decorator';
import { AdminJwtAuthGuard } from '../admin-auth/guards/admin-jwt-auth.guard';
import { AdminRolesGuard } from '../admin-auth/guards/admin-roles.guard';
import { ErrorResponseDto } from '../swagger/swagger.models';
import { ConfirmOccurrenceDto } from './dto/confirm-occurrence.dto';
import { CreateEventDto } from './dto/create-event.dto';
import { QueryOccurrencesDto } from './dto/query-occurrences.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { UpdateOccurrenceDto } from './dto/update-occurrence.dto';
import { UpsertDayNoteDto } from './dto/upsert-day-note.dto';
import { EventsService } from './events.service';

@ApiTags('Admin Events')
@ApiBearerAuth('admin-auth')
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@ApiForbiddenResponse({ type: ErrorResponseDto })
@UseGuards(AdminJwtAuthGuard, AdminRolesGuard)
@AdminRoles('super_admin', 'editor')
@Controller('admin/events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  // ── Events (templates) ─────────────────────────────────────────────

  @ApiOperation({
    summary: 'List events',
    description: 'Returns all events with their confirmed occurrences.',
  })
  @ApiOkResponse({ description: 'Admin event records.' })
  @Get()
  findAllAdmin() {
    return this.eventsService.findAll();
  }

  @ApiOperation({
    summary: 'Calendar feed across all events',
    description:
      'Expands and merges occurrences for every event within [from, to], each item carrying its parent event context. Unconfirmed candidate dates are only emitted for active events.',
  })
  @ApiOkResponse({ description: 'Occurrences across all events in the window.' })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @Get('calendar')
  listCalendar(@Query() query: QueryOccurrencesDto) {
    return this.eventsService.listCalendar(query.from, query.to);
  }

  // ── Day notes ──────────────────────────────────────────────────────

  @ApiOperation({
    summary: 'List day notes in a window',
    description: 'Returns free-text day notes whose date falls within [from, to].',
  })
  @ApiOkResponse({ description: 'Day notes in the window.' })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @Get('day-notes')
  listDayNotes(@Query() query: QueryOccurrencesDto) {
    return this.eventsService.listDayNotes(query.from, query.to);
  }

  @ApiOperation({
    summary: 'Create or replace a day note',
    description: 'Upserts the note for a single calendar date (YYYY-MM-DD).',
  })
  @ApiParam({ name: 'date', description: 'Calendar date (YYYY-MM-DD).', example: '2026-07-01' })
  @ApiOkResponse({ description: 'The stored day note.' })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @Put('day-notes/:date')
  upsertDayNote(
    @Param('date') date: string,
    @Body() dto: UpsertDayNoteDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.eventsService.upsertDayNote(date, dto, admin);
  }

  @ApiOperation({
    summary: 'Delete a day note',
    description: 'Removes the note for a single calendar date (YYYY-MM-DD).',
  })
  @ApiParam({ name: 'date', description: 'Calendar date (YYYY-MM-DD).', example: '2026-07-01' })
  @ApiNoContentResponse({ description: 'Day note deleted successfully.' })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @Delete('day-notes/:date')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeDayNote(@Param('date') date: string) {
    await this.eventsService.removeDayNote(date);
  }

  @ApiOperation({ summary: 'Get an event by UUID' })
  @ApiParam({ name: 'id', description: 'Event UUID.', format: 'uuid' })
  @ApiOkResponse({ description: 'Admin event record.' })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @Get(':id')
  findOneAdmin(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.eventsService.findOne(id);
  }

  @ApiOperation({
    summary: 'Create an event',
    description: 'Creates a single or recurring event template.',
  })
  @ApiCreatedResponse({ description: 'Created admin event record.' })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @Post()
  createAdmin(
    @Body() dto: CreateEventDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.eventsService.create(dto, admin);
  }

  @ApiOperation({ summary: 'Update an event' })
  @ApiParam({ name: 'id', description: 'Event UUID.', format: 'uuid' })
  @ApiOkResponse({ description: 'Updated admin event record.' })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @Patch(':id')
  updateAdmin(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateEventDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.eventsService.update(id, dto, admin);
  }

  @ApiOperation({
    summary: 'Cancel an event',
    description: 'Sets the event status to `cancelled`.',
  })
  @ApiParam({ name: 'id', description: 'Event UUID.', format: 'uuid' })
  @ApiOkResponse({ description: 'Cancelled admin event record.' })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @Post(':id/cancel')
  cancelAdmin(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.eventsService.cancel(id, admin);
  }

  @ApiOperation({
    summary: 'Delete an event',
    description: 'Deletes an event and all its confirmed occurrences.',
  })
  @ApiParam({ name: 'id', description: 'Event UUID.', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Event deleted successfully.' })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeAdmin(@Param('id', new ParseUUIDPipe()) id: string) {
    await this.eventsService.remove(id);
  }

  // ── Occurrences (concretions) ──────────────────────────────────────

  @ApiOperation({
    summary: 'List occurrences in a window',
    description:
      'Expands candidate dates from the event schedule within [from, to] and merges them with confirmed occurrences. Each item is flagged unconfirmed, confirmed, or cancelled.',
  })
  @ApiParam({ name: 'id', description: 'Event UUID.', format: 'uuid' })
  @ApiOkResponse({ description: 'Candidate and confirmed occurrences in the window.' })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @Get(':id/occurrences')
  listOccurrences(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query() query: QueryOccurrencesDto,
  ) {
    return this.eventsService.listOccurrences(id, query.from, query.to);
  }

  @ApiOperation({
    summary: 'Confirm an occurrence',
    description:
      'Confirms a scheduled date, assigning guide(s) and an optional note. Rejected if an assigned guide is unavailable on that date.',
  })
  @ApiParam({ name: 'id', description: 'Event UUID.', format: 'uuid' })
  @ApiCreatedResponse({ description: 'Confirmed occurrence record.' })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @Post(':id/occurrences')
  confirmOccurrence(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ConfirmOccurrenceDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.eventsService.confirmOccurrence(id, dto, admin);
  }

  @ApiOperation({
    summary: 'Update a confirmed occurrence',
    description: 'Changes the assigned guide(s) and/or note. Re-validates availability.',
  })
  @ApiParam({ name: 'id', description: 'Event UUID.', format: 'uuid' })
  @ApiParam({ name: 'occurrenceId', description: 'Occurrence UUID.', format: 'uuid' })
  @ApiOkResponse({ description: 'Updated occurrence record.' })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @Patch(':id/occurrences/:occurrenceId')
  updateOccurrence(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('occurrenceId', new ParseUUIDPipe()) occurrenceId: string,
    @Body() dto: UpdateOccurrenceDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.eventsService.updateOccurrence(id, occurrenceId, dto, admin);
  }

  @ApiOperation({
    summary: 'Cancel a confirmed occurrence',
    description: 'Sets the occurrence status to `cancelled`.',
  })
  @ApiParam({ name: 'id', description: 'Event UUID.', format: 'uuid' })
  @ApiParam({ name: 'occurrenceId', description: 'Occurrence UUID.', format: 'uuid' })
  @ApiOkResponse({ description: 'Cancelled occurrence record.' })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @Post(':id/occurrences/:occurrenceId/cancel')
  cancelOccurrence(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('occurrenceId', new ParseUUIDPipe()) occurrenceId: string,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.eventsService.cancelOccurrence(id, occurrenceId, admin);
  }

  @ApiOperation({
    summary: 'Delete a confirmed occurrence',
    description: 'Deletes the occurrence, reverting the date to an unconfirmed candidate.',
  })
  @ApiParam({ name: 'id', description: 'Event UUID.', format: 'uuid' })
  @ApiParam({ name: 'occurrenceId', description: 'Occurrence UUID.', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Occurrence deleted successfully.' })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @Delete(':id/occurrences/:occurrenceId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeOccurrence(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('occurrenceId', new ParseUUIDPipe()) occurrenceId: string,
  ) {
    await this.eventsService.removeOccurrence(id, occurrenceId);
  }
}
