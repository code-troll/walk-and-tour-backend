import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiFoundResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiTooManyRequestsResponse,
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
import { NewsletterTokenQueryDto } from './dto/newsletter-token-query.dto';
import {
  NEWSLETTER_PUBLIC_RATE_LIMITS,
  NewsletterPublicRateLimit,
  NewsletterPublicRateLimitGuard,
} from './newsletter-public-rate-limit.guard';
import { buildNewsletterPublicRedirectUrl } from './newsletter-public-redirects';
import { SubscribeNewsletterDto } from './dto/subscribe-newsletter.dto';
import { NewsletterSubscribersService } from './newsletter-subscribers.service';

interface RedirectResponse {
  redirect(statusCode: number, url: string): void;
}

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
  @ApiTooManyRequestsResponse({ type: ErrorResponseDto })
  @Post('public/newsletter/subscribers/subscribe')
  @UseGuards(NewsletterPublicRateLimitGuard)
  @NewsletterPublicRateLimit(NEWSLETTER_PUBLIC_RATE_LIMITS.subscribe)
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
  @ApiTooManyRequestsResponse({ type: ErrorResponseDto })
  @Post('public/newsletter/subscribers/confirm')
  @UseGuards(NewsletterPublicRateLimitGuard)
  @NewsletterPublicRateLimit(NEWSLETTER_PUBLIC_RATE_LIMITS.confirm)
  confirm(@Body() dto: NewsletterTokenDto): Promise<unknown> {
    return this.newsletterSubscribersService.confirm(dto.token);
  }

  @ApiTags('Public Newsletter Subscribers')
  @ApiOperation({
    summary: 'Confirm newsletter subscription via direct link',
    description:
      'Confirms a newsletter subscription using a token carried in a direct email link.',
  })
  @ApiQuery({
    name: 'token',
    description: 'Opaque newsletter confirmation token.',
    example: '0123456789abcdef0123456789abcdef0123456789abcdef',
  })
  @ApiFoundResponse({
    description:
      'Redirects the browser to the configured public confirmation page with a success or error status.',
    schema: {
      type: 'object',
      properties: {
        location: {
          type: 'string',
          example: 'https://www.walkandtour.test/newsletter/confirm?status=success',
        },
      },
    },
  })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiTooManyRequestsResponse({ type: ErrorResponseDto })
  @Get('public/newsletter/subscribers/confirm')
  @UseGuards(NewsletterPublicRateLimitGuard)
  @NewsletterPublicRateLimit(NEWSLETTER_PUBLIC_RATE_LIMITS.confirm)
  async confirmByLink(
    @Query() query: NewsletterTokenQueryDto,
    @Res() response: RedirectResponse,
  ): Promise<void> {
    try {
      await this.newsletterSubscribersService.confirm(query.token);
      response.redirect(
        HttpStatus.FOUND,
        buildNewsletterPublicRedirectUrl('confirm', 'success'),
      );
    } catch (error) {
      response.redirect(
        HttpStatus.FOUND,
        mapNewsletterConfirmationRedirect(error),
      );
    }
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
  @ApiTooManyRequestsResponse({ type: ErrorResponseDto })
  @Post('public/newsletter/subscribers/unsubscribe')
  @UseGuards(NewsletterPublicRateLimitGuard)
  @NewsletterPublicRateLimit(NEWSLETTER_PUBLIC_RATE_LIMITS.unsubscribe)
  unsubscribe(@Body() dto: NewsletterTokenDto): Promise<unknown> {
    return this.newsletterSubscribersService.unsubscribe(dto.token);
  }

  @ApiTags('Public Newsletter Subscribers')
  @ApiOperation({
    summary: 'Unsubscribe via direct link',
    description:
      'Unsubscribes a newsletter subscriber using a token carried in a direct email link.',
  })
  @ApiQuery({
    name: 'token',
    description: 'Opaque newsletter unsubscribe token.',
    example: '0123456789abcdef0123456789abcdef0123456789abcdef',
  })
  @ApiFoundResponse({
    description:
      'Redirects the browser to the configured public unsubscribe page with a success or error status.',
    schema: {
      type: 'object',
      properties: {
        location: {
          type: 'string',
          example:
            'https://www.walkandtour.test/newsletter/unsubscribe?status=success',
        },
      },
    },
  })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiTooManyRequestsResponse({ type: ErrorResponseDto })
  @Get('public/newsletter/subscribers/unsubscribe')
  @UseGuards(NewsletterPublicRateLimitGuard)
  @NewsletterPublicRateLimit(NEWSLETTER_PUBLIC_RATE_LIMITS.unsubscribe)
  async unsubscribeByLink(
    @Query() query: NewsletterTokenQueryDto,
    @Res() response: RedirectResponse,
  ): Promise<void> {
    try {
      await this.newsletterSubscribersService.unsubscribe(query.token);
      response.redirect(
        HttpStatus.FOUND,
        buildNewsletterPublicRedirectUrl('unsubscribe', 'success'),
      );
    } catch (error) {
      response.redirect(
        HttpStatus.FOUND,
        mapNewsletterUnsubscribeRedirect(error),
      );
    }
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

function mapNewsletterConfirmationRedirect(error: unknown): string {
  if (error instanceof NotFoundException) {
    return buildNewsletterPublicRedirectUrl('confirm', 'error', 'invalid_token');
  }

  if (error instanceof BadRequestException) {
    return buildNewsletterPublicRedirectUrl('confirm', 'error', 'invalid_state');
  }

  return buildNewsletterPublicRedirectUrl('confirm', 'error', 'server_error');
}

function mapNewsletterUnsubscribeRedirect(error: unknown): string {
  if (error instanceof NotFoundException) {
    return buildNewsletterPublicRedirectUrl(
      'unsubscribe',
      'error',
      'invalid_token',
    );
  }

  return buildNewsletterPublicRedirectUrl(
    'unsubscribe',
    'error',
    'server_error',
  );
}
