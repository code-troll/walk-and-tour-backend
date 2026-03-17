import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import {
  NewsletterPublicRateLimitGuard,
  NewsletterPublicRateLimitStore,
} from './newsletter-public-rate-limit.guard';
import { NewsletterSubscribersController } from './newsletter-subscribers.controller';
import { NewsletterSubscribersService } from './newsletter-subscribers.service';

describe('NewsletterPublicRateLimitGuard', () => {
  let controller: NewsletterSubscribersController;
  let guard: NewsletterPublicRateLimitGuard;

  beforeEach(() => {
    controller = new NewsletterSubscribersController({
      subscribe: jest.fn(),
      confirm: jest.fn(),
      unsubscribe: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      exportCsv: jest.fn(),
    } as unknown as jest.Mocked<NewsletterSubscribersService>);

    guard = new NewsletterPublicRateLimitGuard(
      new Reflector(),
      new NewsletterPublicRateLimitStore(),
    );
  });

  it('allows the first five subscribe requests and rejects the sixth', () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect(
        guard.canActivate(
          createExecutionContext(controller.subscribe, {
            headers: { 'x-forwarded-for': '198.51.100.20' },
          }),
        ),
      ).toBe(true);
    }

    expect(() =>
      guard.canActivate(
        createExecutionContext(controller.subscribe, {
          headers: { 'x-forwarded-for': '198.51.100.20' },
        }),
      ),
    ).toThrow('Too many newsletter requests. Please try again later.');
  });

  it('keeps confirm and unsubscribe limits independent', () => {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      expect(
        guard.canActivate(
          createExecutionContext(controller.confirm, {
            headers: { 'x-forwarded-for': '198.51.100.21' },
          }),
        ),
      ).toBe(true);
    }

    expect(() =>
      guard.canActivate(
        createExecutionContext(controller.confirm, {
          headers: { 'x-forwarded-for': '198.51.100.21' },
        }),
      ),
    ).toThrow('Too many newsletter requests. Please try again later.');

    expect(
      guard.canActivate(
        createExecutionContext(controller.unsubscribe, {
          headers: { 'x-forwarded-for': '198.51.100.21' },
        }),
      ),
    ).toBe(true);
  });

  it('falls back to request ip when no forwarded header is present', () => {
    expect(
      guard.canActivate(
        createExecutionContext(controller.subscribe, {
          ip: '203.0.113.50',
        }),
      ),
    ).toBe(true);
  });
});

type PublicNewsletterHandler =
  | NewsletterSubscribersController['subscribe']
  | NewsletterSubscribersController['confirm']
  | NewsletterSubscribersController['unsubscribe'];

function createExecutionContext(
  handler: PublicNewsletterHandler,
  request: {
    headers?: Record<string, string | undefined>;
    ip?: string;
    socket?: { remoteAddress?: string | undefined };
  },
) {
  return {
    getHandler: () => handler,
    getClass: () => NewsletterSubscribersController,
    getArgs: () => [],
    getArgByIndex: () => undefined,
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => undefined,
      getNext: () => undefined,
    }),
    switchToRpc: () => ({
      getData: () => undefined,
      getContext: () => undefined,
    }),
    switchToWs: () => ({
      getData: () => undefined,
      getClient: () => undefined,
      getPattern: () => undefined,
    }),
    getType: () => 'http',
  } as unknown as ExecutionContext;
}
