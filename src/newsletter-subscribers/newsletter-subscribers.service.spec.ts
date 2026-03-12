import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ILike } from 'typeorm';

import { EmailProvider } from '../providers/email/email-provider.interface';
import { createRepositoryMock, RepositoryMock } from '../../test/utils/repository.mock';
import { NewsletterSubscriberEntity } from './newsletter-subscriber.entity';
import { NewsletterSubscribersService } from './newsletter-subscribers.service';
import { NewsletterTokenService } from './newsletter-token.service';

describe('NewsletterSubscribersService', () => {
  let service: NewsletterSubscribersService;
  let subscribersRepository: RepositoryMock<NewsletterSubscriberEntity>;
  let tokenService: jest.Mocked<NewsletterTokenService>;
  let emailProvider: jest.Mocked<EmailProvider>;

  beforeEach(() => {
    process.env.APP_BASE_URL = 'https://backend.example.com';
    subscribersRepository = createRepositoryMock<NewsletterSubscriberEntity>();
    tokenService = {
      generateToken: jest
        .fn()
        .mockReturnValueOnce('confirmation-token')
        .mockReturnValueOnce('unsubscribe-token')
        .mockReturnValueOnce('confirmation-token')
        .mockReturnValueOnce('unsubscribe-token'),
      hashToken: jest.fn((token: string) => `hash:${token}`),
    } as unknown as jest.Mocked<NewsletterTokenService>;
    emailProvider = {
      sendNewsletterConfirmation: jest.fn(),
    };

    service = new NewsletterSubscribersService(
      subscribersRepository as never,
      tokenService,
      emailProvider,
    );
  });

  it('creates a pending subscriber on first subscribe request', async () => {
    subscribersRepository.findOne.mockResolvedValue(null);
    subscribersRepository.create.mockImplementation((value) => value);
    subscribersRepository.save.mockImplementation(async (value) => ({
      id: 'subscriber-1',
      createdAt: new Date('2026-03-12T10:00:00.000Z'),
      updatedAt: new Date('2026-03-12T10:00:00.000Z'),
      ...value,
    }));

    const result = await service.subscribe({
      email: 'Subscriber@Example.com',
      preferredLocale: 'en',
      consentSource: 'footer_form',
      sourceMetadata: { page: '/' },
    });

    expect(subscribersRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'subscriber@example.com',
        subscriptionStatus: 'pending_confirmation',
        preferredLocale: 'en',
        consentSource: 'footer_form',
        sourceMetadata: { page: '/' },
        confirmationTokenHash: 'hash:confirmation-token',
        unsubscribeTokenHash: 'hash:unsubscribe-token',
      }),
    );
    expect(emailProvider.sendNewsletterConfirmation).toHaveBeenCalledWith({
      recipientEmail: 'subscriber@example.com',
      confirmationUrl:
        'https://backend.example.com/api/public/newsletter/subscribers/confirm?token=confirmation-token',
      unsubscribeUrl:
        'https://backend.example.com/api/public/newsletter/subscribers/unsubscribe?token=unsubscribe-token',
      preferredLocale: 'en',
    });
    expect(result).toEqual(
      expect.objectContaining({
        email: 'subscriber@example.com',
        subscriptionStatus: 'pending_confirmation',
        alreadySubscribed: false,
        nextAction: 'confirm_email',
        preferredLocale: 'en',
        consentedAt: expect.any(Date),
      }),
    );
  });

  it('returns already subscribed without mutating an active subscriber', async () => {
    subscribersRepository.findOne.mockResolvedValue(
      createSubscriberEntity({
        subscriptionStatus: 'subscribed',
        confirmedAt: new Date('2026-03-12T10:00:00.000Z'),
      }),
    );

    const result = await service.subscribe({
      email: 'subscriber@example.com',
    });

    expect(subscribersRepository.save).not.toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        email: 'subscriber@example.com',
        subscriptionStatus: 'subscribed',
        alreadySubscribed: true,
        nextAction: 'none',
      }),
    );
  });

  it('restarts confirmation for an unsubscribed subscriber', async () => {
    subscribersRepository.findOne.mockResolvedValue(
      createSubscriberEntity({
        subscriptionStatus: 'unsubscribed',
        unsubscribedAt: new Date('2026-03-12T10:00:00.000Z'),
      }),
    );
    subscribersRepository.save.mockImplementation(async (value) => value);

    const result = await service.subscribe({
      email: 'subscriber@example.com',
      preferredLocale: 'es',
    });

    expect(subscribersRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        subscriptionStatus: 'pending_confirmation',
        preferredLocale: 'es',
        confirmedAt: null,
        unsubscribedAt: null,
        confirmationTokenHash: 'hash:confirmation-token',
        unsubscribeTokenHash: 'hash:unsubscribe-token',
      }),
    );
    expect(emailProvider.sendNewsletterConfirmation).toHaveBeenCalledWith({
      recipientEmail: 'subscriber@example.com',
      confirmationUrl:
        'https://backend.example.com/api/public/newsletter/subscribers/confirm?token=confirmation-token',
      unsubscribeUrl:
        'https://backend.example.com/api/public/newsletter/subscribers/unsubscribe?token=unsubscribe-token',
      preferredLocale: 'es',
    });
    expect(result).toEqual(
      expect.objectContaining({
        subscriptionStatus: 'pending_confirmation',
        preferredLocale: 'es',
      }),
    );
  });

  it('confirms a pending subscriber by token', async () => {
    subscribersRepository.findOne.mockResolvedValue(
      createSubscriberEntity({
        subscriptionStatus: 'pending_confirmation',
        confirmationTokenHash: 'hash:confirmation-token',
      }),
    );
    subscribersRepository.save.mockImplementation(async (value) => value);

    const result = await service.confirm('confirmation-token');

    expect(tokenService.hashToken).toHaveBeenCalledWith('confirmation-token');
    expect(subscribersRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        subscriptionStatus: 'subscribed',
        confirmationTokenHash: null,
        confirmedAt: expect.any(Date),
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        email: 'subscriber@example.com',
        subscriptionStatus: 'subscribed',
        confirmedAt: expect.any(Date),
      }),
    );
  });

  it('rejects confirmation when the subscriber is not pending', async () => {
    subscribersRepository.findOne.mockResolvedValue(
      createSubscriberEntity({
        subscriptionStatus: 'subscribed',
        confirmationTokenHash: 'hash:confirmation-token',
      }),
    );

    await expect(service.confirm('confirmation-token')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects unknown confirmation tokens', async () => {
    subscribersRepository.findOne.mockResolvedValue(null);

    await expect(service.confirm('missing-token')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('unsubscribes a subscriber by token and keeps the operation idempotent', async () => {
    const existing = createSubscriberEntity({
      subscriptionStatus: 'subscribed',
      unsubscribeTokenHash: 'hash:unsubscribe-token',
      unsubscribedAt: null,
    });

    subscribersRepository.findOne
      .mockResolvedValueOnce(existing)
      .mockResolvedValueOnce(
        createSubscriberEntity({
          subscriptionStatus: 'unsubscribed',
          unsubscribeTokenHash: 'hash:unsubscribe-token',
          unsubscribedAt: new Date('2026-03-12T11:00:00.000Z'),
        }),
      );
    subscribersRepository.save.mockImplementation(async (value) => value);

    const first = await service.unsubscribe('unsubscribe-token');
    const second = await service.unsubscribe('unsubscribe-token');

    expect(subscribersRepository.save).toHaveBeenCalledTimes(1);
    expect(first).toEqual(
      expect.objectContaining({
        subscriptionStatus: 'unsubscribed',
        unsubscribedAt: expect.any(Date),
      }),
    );
    expect(second).toEqual(
      expect.objectContaining({
        subscriptionStatus: 'unsubscribed',
        unsubscribedAt: new Date('2026-03-12T11:00:00.000Z'),
      }),
    );
  });

  it('lists newsletter subscribers with filtering and pagination metadata', async () => {
    subscribersRepository.findAndCount.mockResolvedValue([
      [createSubscriberEntity()],
      1,
    ]);

    const result = await service.findAll({
      q: 'subscriber',
      status: 'subscribed',
      page: 2,
      limit: 10,
    });

    expect(subscribersRepository.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: [
          {
            subscriptionStatus: 'subscribed',
            email: ILike('%subscriber%'),
          },
        ],
        skip: 10,
        take: 10,
      }),
    );
    expect(result).toEqual({
      items: [
        expect.objectContaining({
          id: 'subscriber-1',
          email: 'subscriber@example.com',
          subscriptionStatus: 'subscribed',
        }),
      ],
      total: 1,
      page: 2,
      limit: 10,
    });
  });

  it('exports filtered newsletter subscribers as csv', async () => {
    subscribersRepository.find.mockResolvedValue([
      createSubscriberEntity({
        email: 'subscriber@example.com',
        preferredLocale: 'en',
        consentSource: 'footer_form',
      }),
    ]);

    const result = await service.exportCsv({
      q: 'subscriber',
      status: 'subscribed',
    });

    expect(subscribersRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: [
          {
            subscriptionStatus: 'subscribed',
            email: ILike('%subscriber%'),
          },
        ],
      }),
    );
    expect(result).toContain('"email","subscriptionStatus"');
    expect(result).toContain('"subscriber@example.com"');
    expect(result).toContain('"subscribed"');
  });
});

function createSubscriberEntity(
  overrides: Partial<NewsletterSubscriberEntity> = {},
): NewsletterSubscriberEntity {
  return {
    id: 'subscriber-1',
    email: 'subscriber@example.com',
    subscriptionStatus: 'subscribed',
    preferredLocale: 'en',
    consentSource: 'footer_form',
    sourceMetadata: { page: '/' },
    consentedAt: new Date('2026-03-12T09:00:00.000Z'),
    confirmedAt: new Date('2026-03-12T10:00:00.000Z'),
    unsubscribedAt: null,
    confirmationTokenHash: null,
    unsubscribeTokenHash: 'hash:unsubscribe-token',
    createdAt: new Date('2026-03-12T09:00:00.000Z'),
    updatedAt: new Date('2026-03-12T10:00:00.000Z'),
    ...overrides,
  } as NewsletterSubscriberEntity;
}
