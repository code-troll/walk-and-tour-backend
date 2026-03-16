import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EmailModule } from '../providers/email/email.module';
import { NewsletterSubscriberEntity } from './newsletter-subscriber.entity';
import { NewsletterSubscribersController } from './newsletter-subscribers.controller';
import {
  NewsletterPublicRateLimitGuard,
  NewsletterPublicRateLimitStore,
} from './newsletter-public-rate-limit.guard';
import { NewsletterSubscribersService } from './newsletter-subscribers.service';
import { NewsletterTokenService } from './newsletter-token.service';

@Module({
  imports: [TypeOrmModule.forFeature([NewsletterSubscriberEntity]), EmailModule],
  controllers: [NewsletterSubscribersController],
  providers: [
    NewsletterSubscribersService,
    NewsletterTokenService,
    NewsletterPublicRateLimitGuard,
    NewsletterPublicRateLimitStore,
  ],
})
export class NewsletterSubscribersModule {}
