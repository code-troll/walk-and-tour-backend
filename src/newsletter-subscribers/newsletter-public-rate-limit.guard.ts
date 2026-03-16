import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

type NewsletterPublicRateLimitAction =
  | 'subscribe'
  | 'confirm'
  | 'unsubscribe';

interface NewsletterPublicRateLimitPolicy {
  action: NewsletterPublicRateLimitAction;
  limit: number;
  windowMs: number;
}

const NEWSLETTER_PUBLIC_RATE_LIMIT_POLICY = Symbol(
  'NEWSLETTER_PUBLIC_RATE_LIMIT_POLICY',
);

const FIFTEEN_MINUTES_IN_MS = 15 * 60 * 1000;

export const NEWSLETTER_PUBLIC_RATE_LIMITS = {
  subscribe: {
    action: 'subscribe',
    limit: 5,
    windowMs: FIFTEEN_MINUTES_IN_MS,
  },
  confirm: {
    action: 'confirm',
    limit: 20,
    windowMs: FIFTEEN_MINUTES_IN_MS,
  },
  unsubscribe: {
    action: 'unsubscribe',
    limit: 20,
    windowMs: FIFTEEN_MINUTES_IN_MS,
  },
} as const satisfies Record<
  NewsletterPublicRateLimitAction,
  NewsletterPublicRateLimitPolicy
>;

export const NewsletterPublicRateLimit = (
  policy: NewsletterPublicRateLimitPolicy,
): MethodDecorator =>
  SetMetadata(NEWSLETTER_PUBLIC_RATE_LIMIT_POLICY, policy);

@Injectable()
export class NewsletterPublicRateLimitStore {
  private readonly timestampsByKey = new Map<string, number[]>();

  consume(policy: NewsletterPublicRateLimitPolicy, clientId: string): boolean {
    const now = Date.now();
    const key = `${policy.action}:${clientId}`;
    const windowStart = now - policy.windowMs;
    const activeTimestamps = (this.timestampsByKey.get(key) ?? []).filter(
      (timestamp) => timestamp > windowStart,
    );

    if (activeTimestamps.length >= policy.limit) {
      this.timestampsByKey.set(key, activeTimestamps);
      return false;
    }

    activeTimestamps.push(now);
    this.timestampsByKey.set(key, activeTimestamps);
    return true;
  }
}

@Injectable()
export class NewsletterPublicRateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rateLimitStore: NewsletterPublicRateLimitStore,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const policy = this.reflector.getAllAndOverride<
      NewsletterPublicRateLimitPolicy | undefined
    >(NEWSLETTER_PUBLIC_RATE_LIMIT_POLICY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!policy) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const clientId = getClientIdentifier(request);

    if (!this.rateLimitStore.consume(policy, clientId)) {
      throw new HttpException(
        'Too many newsletter requests. Please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}

function getClientIdentifier(request: {
  headers?: Record<string, string | string[] | undefined>;
  ip?: string;
  socket?: { remoteAddress?: string | undefined };
}): string {
  const forwardedForHeader = request.headers?.['x-forwarded-for'];

  if (typeof forwardedForHeader === 'string') {
    const firstForwardedIp = forwardedForHeader
      .split(',')
      .map((value) => value.trim())
      .find((value) => value.length > 0);

    if (firstForwardedIp) {
      return firstForwardedIp;
    }
  }

  if (request.ip && request.ip.length > 0) {
    return request.ip;
  }

  if (request.socket?.remoteAddress) {
    return request.socket.remoteAddress;
  }

  return 'unknown';
}
