import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EmailModule } from '../providers/email/email.module';
import { NewsletterSubscriberEntity } from './newsletter-subscriber.entity';
import { NewsletterSubscribersController } from './newsletter-subscribers.controller';
import { NewsletterSubscribersService } from './newsletter-subscribers.service';
import { NewsletterTokenService } from './newsletter-token.service';

@Module({
  imports: [TypeOrmModule.forFeature([NewsletterSubscriberEntity]), EmailModule],
  controllers: [NewsletterSubscribersController],
  providers: [NewsletterSubscribersService, NewsletterTokenService],
})
export class NewsletterSubscribersModule {}
