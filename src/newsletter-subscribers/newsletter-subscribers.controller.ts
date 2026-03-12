import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { AdminRoles } from '../admin-auth/decorators/admin-roles.decorator';
import { AdminJwtAuthGuard } from '../admin-auth/guards/admin-jwt-auth.guard';
import { AdminRolesGuard } from '../admin-auth/guards/admin-roles.guard';
import {
  ErrorResponseDto,
  NewsletterSubscriberAdminListResponseDto,
  NewsletterSubscriberAdminResponseDto,
  NewsletterSubscriptionConfirmedResponseDto,
  NewsletterSubscriptionRequestedResponseDto,
  NewsletterUnsubscribedResponseDto,
} from '../swagger/swagger.models';
import { AdminExportNewsletterSubscribersDto } from './dto/admin-export-newsletter-subscribers.dto';
import { AdminListNewsletterSubscribersDto } from './dto/admin-list-newsletter-subscribers.dto';
import { NewsletterTokenDto } from './dto/newsletter-token.dto';
import { SubscribeNewsletterDto } from './dto/subscribe-newsletter.dto';
import { NewsletterSubscribersService } from './newsletter-subscribers.service';

@Controller()
export class NewsletterSubscribersController {
  constructor(
    private readonly newsletterSubscribersService: NewsletterSubscribersService,
  ) {}

  @ApiTags('Public Newsletter Subscribers')
  @ApiOperation({
    summary: 'Start newsletter subscription',
    description:
      'Starts or restarts the double opt-in flow. The subscriber remains in `pending_confirmation` until the confirmation token is used.',
  })
  @ApiCreatedResponse({
    description: 'Subscription request accepted.',
    type: NewsletterSubscriptionRequestedResponseDto,
  })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @Post('public/newsletter/subscribers/subscribe')
  subscribe(@Body() dto: SubscribeNewsletterDto): Promise<unknown> {
    return this.newsletterSubscribersService.subscribe(dto);
  }

  @ApiTags('Public Newsletter Subscribers')
  @ApiOperation({
    summary: 'Confirm newsletter subscription',
    description:
      'Completes the double opt-in flow using a confirmation token delivered through email.',
  })
  @ApiOkResponse({
    description: 'Newsletter subscription confirmed.',
    type: NewsletterSubscriptionConfirmedResponseDto,
  })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @Post('public/newsletter/subscribers/confirm')
  confirm(@Body() dto: NewsletterTokenDto): Promise<unknown> {
    return this.newsletterSubscribersService.confirm(dto.token);
  }

  @ApiTags('Public Newsletter Subscribers')
  @ApiOperation({
    summary: 'Unsubscribe from the newsletter',
    description:
      'Unsubscribes a subscriber using the tokenized unsubscribe link delivered through email.',
  })
  @ApiOkResponse({
    description: 'Newsletter subscriber unsubscribed.',
    type: NewsletterUnsubscribedResponseDto,
  })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @Post('public/newsletter/subscribers/unsubscribe')
  unsubscribe(@Body() dto: NewsletterTokenDto): Promise<unknown> {
    return this.newsletterSubscribersService.unsubscribe(dto.token);
  }

  @ApiTags('Admin Newsletter Subscribers')
  @ApiBearerAuth('admin-auth')
  @ApiOperation({
    summary: 'List newsletter subscribers',
    description:
      'Returns newsletter subscribers with optional email search, status filtering, and pagination.',
  })
  @ApiQuery({ name: 'q', required: false, example: 'subscriber@example.com' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['pending_confirmation', 'subscribed', 'unsubscribed'],
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 50 })
  @ApiOkResponse({
    description: 'Paginated newsletter subscribers.',
    type: NewsletterSubscriberAdminListResponseDto,
  })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @Get('admin/newsletter/subscribers')
  @UseGuards(AdminJwtAuthGuard, AdminRolesGuard)
  @AdminRoles('super_admin', 'marketing')
  findAll(@Query() query: AdminListNewsletterSubscribersDto): Promise<unknown> {
    return this.newsletterSubscribersService.findAll(query);
  }

  @ApiTags('Admin Newsletter Subscribers')
  @ApiBearerAuth('admin-auth')
  @ApiOperation({
    summary: 'Export newsletter subscribers as CSV',
    description:
      'Exports newsletter subscribers using the same search and status filters as the list endpoint.',
  })
  @ApiQuery({ name: 'q', required: false, example: 'subscriber@example.com' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['pending_confirmation', 'subscribed', 'unsubscribed'],
  })
  @ApiOkResponse({
    description: 'CSV export of newsletter subscribers.',
    schema: {
      type: 'string',
      format: 'binary',
      example:
        '"id","email","subscriptionStatus","preferredLocale","consentSource","consentedAt","confirmedAt","unsubscribedAt","createdAt","updatedAt"',
    },
  })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header(
    'Content-Disposition',
    'attachment; filename="newsletter-subscribers.csv"',
  )
  @Get('admin/newsletter/subscribers/export')
  @UseGuards(AdminJwtAuthGuard, AdminRolesGuard)
  @AdminRoles('super_admin', 'marketing')
  exportCsv(@Query() query: AdminExportNewsletterSubscribersDto): Promise<string> {
    return this.newsletterSubscribersService.exportCsv(query);
  }

  @ApiTags('Admin Newsletter Subscribers')
  @ApiBearerAuth('admin-auth')
  @ApiOperation({
    summary: 'Get newsletter subscriber detail',
    description: 'Returns the full admin view of a newsletter subscriber record.',
  })
  @ApiParam({
    name: 'id',
    description: 'Newsletter subscriber UUID.',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Newsletter subscriber detail.',
    type: NewsletterSubscriberAdminResponseDto,
  })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @Get('admin/newsletter/subscribers/:id')
  @UseGuards(AdminJwtAuthGuard, AdminRolesGuard)
  @AdminRoles('super_admin', 'marketing')
  findOne(@Param('id', new ParseUUIDPipe()) id: string): Promise<unknown> {
    return this.newsletterSubscribersService.findOne(id);
  }
}
