import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, Repository } from 'typeorm';

import { NEWSLETTER_SUBSCRIPTION_STATUSES } from '../shared/domain';
import { AdminExportNewsletterSubscribersDto } from './dto/admin-export-newsletter-subscribers.dto';
import { AdminListNewsletterSubscribersDto } from './dto/admin-list-newsletter-subscribers.dto';
import { SubscribeNewsletterDto } from './dto/subscribe-newsletter.dto';
import { NewsletterSubscriberEntity } from './newsletter-subscriber.entity';
import { NewsletterTokenService } from './newsletter-token.service';

type NewsletterSubscriptionStatus =
  (typeof NEWSLETTER_SUBSCRIPTION_STATUSES)[number];

interface SubscriberListResult {
  items: unknown[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class NewsletterSubscribersService {
  constructor(
    @InjectRepository(NewsletterSubscriberEntity)
    private readonly subscribersRepository: Repository<NewsletterSubscriberEntity>,
    private readonly tokenService: NewsletterTokenService,
  ) {}

  async subscribe(dto: SubscribeNewsletterDto): Promise<unknown> {
    const email = normalizeEmail(dto.email);
    const existing = await this.subscribersRepository.findOne({
      where: { email },
    });

    if (!existing) {
      const confirmationToken = this.tokenService.generateToken();
      const unsubscribeToken = this.tokenService.generateToken();
      const entity = this.subscribersRepository.create({
        email,
        subscriptionStatus: 'pending_confirmation',
        preferredLocale: dto.preferredLocale ?? null,
        consentSource: dto.consentSource ?? null,
        sourceMetadata: dto.sourceMetadata ?? {},
        consentedAt: new Date(),
        confirmedAt: null,
        unsubscribedAt: null,
        confirmationTokenHash: this.tokenService.hashToken(confirmationToken),
        unsubscribeTokenHash: this.tokenService.hashToken(unsubscribeToken),
      });

      const saved = await this.subscribersRepository.save(entity);
      return this.toSubscriptionRequestResponse(saved, false);
    }

    if (existing.subscriptionStatus === 'subscribed') {
      return this.toSubscriptionRequestResponse(existing, true);
    }

    const confirmationToken = this.tokenService.generateToken();
    const unsubscribeToken = this.tokenService.generateToken();
    existing.subscriptionStatus = 'pending_confirmation';
    existing.preferredLocale = dto.preferredLocale ?? existing.preferredLocale;
    existing.consentSource = dto.consentSource ?? existing.consentSource;
    existing.sourceMetadata = dto.sourceMetadata ?? existing.sourceMetadata;
    existing.consentedAt = new Date();
    existing.confirmedAt = null;
    existing.unsubscribedAt = null;
    existing.confirmationTokenHash = this.tokenService.hashToken(confirmationToken);
    existing.unsubscribeTokenHash = this.tokenService.hashToken(unsubscribeToken);

    const saved = await this.subscribersRepository.save(existing);
    return this.toSubscriptionRequestResponse(saved, false);
  }

  async confirm(token: string): Promise<unknown> {
    const subscriber = await this.findByConfirmationTokenOrThrow(token);

    if (subscriber.subscriptionStatus !== 'pending_confirmation') {
      throw new BadRequestException(
        `Subscriber "${subscriber.email}" is not awaiting confirmation.`,
      );
    }

    subscriber.subscriptionStatus = 'subscribed';
    subscriber.confirmedAt = new Date();
    subscriber.unsubscribedAt = null;
    subscriber.confirmationTokenHash = null;

    const saved = await this.subscribersRepository.save(subscriber);

    return this.toConfirmationResponse(saved);
  }

  async unsubscribe(token: string): Promise<unknown> {
    const subscriber = await this.findByUnsubscribeTokenOrThrow(token);

    if (subscriber.subscriptionStatus !== 'unsubscribed') {
      subscriber.subscriptionStatus = 'unsubscribed';
      subscriber.unsubscribedAt = new Date();
      subscriber.confirmationTokenHash = null;
      await this.subscribersRepository.save(subscriber);
    }

    return this.toUnsubscribeResponse(subscriber);
  }

  async findAll(query: AdminListNewsletterSubscribersDto): Promise<SubscriberListResult> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const where = this.buildAdminWhere(query);

    const [items, total] = await this.subscribersRepository.findAndCount({
      where,
      order: {
        consentedAt: 'DESC',
        email: 'ASC',
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items: items.map((subscriber) => this.toAdminResponse(subscriber)),
      total,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<unknown> {
    const subscriber = await this.subscribersRepository.findOne({
      where: { id },
    });

    if (!subscriber) {
      throw new NotFoundException(`Newsletter subscriber "${id}" was not found.`);
    }

    return this.toAdminResponse(subscriber);
  }

  async exportCsv(query: AdminExportNewsletterSubscribersDto): Promise<string> {
    const subscribers = await this.subscribersRepository.find({
      where: this.buildAdminWhere(query),
      order: {
        consentedAt: 'DESC',
        email: 'ASC',
      },
    });

    const header = [
      'id',
      'email',
      'subscriptionStatus',
      'preferredLocale',
      'consentSource',
      'consentedAt',
      'confirmedAt',
      'unsubscribedAt',
      'createdAt',
      'updatedAt',
    ];

    const rows = subscribers.map((subscriber) => [
      subscriber.id,
      subscriber.email,
      subscriber.subscriptionStatus,
      subscriber.preferredLocale ?? '',
      subscriber.consentSource ?? '',
      subscriber.consentedAt.toISOString(),
      subscriber.confirmedAt?.toISOString() ?? '',
      subscriber.unsubscribedAt?.toISOString() ?? '',
      subscriber.createdAt.toISOString(),
      subscriber.updatedAt.toISOString(),
    ]);

    return [header, ...rows].map((row) => row.map(toCsvCell).join(',')).join('\n');
  }

  private buildAdminWhere(
    query:
      | AdminListNewsletterSubscribersDto
      | AdminExportNewsletterSubscribersDto,
  ): FindOptionsWhere<NewsletterSubscriberEntity> | FindOptionsWhere<NewsletterSubscriberEntity>[] {
    const base: FindOptionsWhere<NewsletterSubscriberEntity> = {};

    if (query.status) {
      base.subscriptionStatus = query.status;
    }

    if (!query.q) {
      return base;
    }

    return [
      {
        ...base,
        email: ILike(`%${query.q.trim()}%`),
      },
    ];
  }

  private async findByConfirmationTokenOrThrow(
    token: string,
  ): Promise<NewsletterSubscriberEntity> {
    const subscriber = await this.subscribersRepository.findOne({
      where: {
        confirmationTokenHash: this.tokenService.hashToken(token),
      },
    });

    if (!subscriber) {
      throw new NotFoundException('Newsletter confirmation token is invalid.');
    }

    return subscriber;
  }

  private async findByUnsubscribeTokenOrThrow(
    token: string,
  ): Promise<NewsletterSubscriberEntity> {
    const subscriber = await this.subscribersRepository.findOne({
      where: {
        unsubscribeTokenHash: this.tokenService.hashToken(token),
      },
    });

    if (!subscriber) {
      throw new NotFoundException('Newsletter unsubscribe token is invalid.');
    }

    return subscriber;
  }

  private toSubscriptionRequestResponse(
    subscriber: NewsletterSubscriberEntity,
    alreadySubscribed: boolean,
  ): unknown {
    return {
      email: subscriber.email,
      subscriptionStatus: subscriber.subscriptionStatus,
      alreadySubscribed,
      nextAction:
        subscriber.subscriptionStatus === 'subscribed' ? 'none' : 'confirm_email',
      preferredLocale: subscriber.preferredLocale,
      consentedAt: subscriber.consentedAt,
    };
  }

  private toConfirmationResponse(subscriber: NewsletterSubscriberEntity): unknown {
    return {
      email: subscriber.email,
      subscriptionStatus: subscriber.subscriptionStatus,
      confirmedAt: subscriber.confirmedAt,
    };
  }

  private toUnsubscribeResponse(subscriber: NewsletterSubscriberEntity): unknown {
    return {
      email: subscriber.email,
      subscriptionStatus: subscriber.subscriptionStatus,
      unsubscribedAt: subscriber.unsubscribedAt,
    };
  }

  private toAdminResponse(subscriber: NewsletterSubscriberEntity): unknown {
    return {
      id: subscriber.id,
      email: subscriber.email,
      subscriptionStatus: subscriber.subscriptionStatus as NewsletterSubscriptionStatus,
      preferredLocale: subscriber.preferredLocale,
      consentSource: subscriber.consentSource,
      sourceMetadata: subscriber.sourceMetadata,
      consentedAt: subscriber.consentedAt,
      confirmedAt: subscriber.confirmedAt,
      unsubscribedAt: subscriber.unsubscribedAt,
      createdAt: subscriber.createdAt,
      updatedAt: subscriber.updatedAt,
    };
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function toCsvCell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}
