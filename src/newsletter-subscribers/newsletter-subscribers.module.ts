import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { NewsletterSubscriberEntity } from './newsletter-subscriber.entity';
import { NewsletterSubscribersController } from './newsletter-subscribers.controller';
import { NewsletterSubscribersService } from './newsletter-subscribers.service';
import { NewsletterTokenService } from './newsletter-token.service';

@Module({
  imports: [TypeOrmModule.forFeature([NewsletterSubscriberEntity])],
  controllers: [NewsletterSubscribersController],
  providers: [NewsletterSubscribersService, NewsletterTokenService],
})
export class NewsletterSubscribersModule {}
