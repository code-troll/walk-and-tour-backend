import 'reflect-metadata';

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';

import { AdminUserEntity } from '../../admin-users/admin-user.entity';
import { AppModule } from '../../app.module';
import { BlogPostsService } from '../../blog-posts/blog-posts.service';
import { LanguageEntity } from '../../languages/language.entity';
import { MediaAssetEntity } from '../../media/media-asset.entity';
import { NewsletterSubscriberEntity } from '../../newsletter-subscribers/newsletter-subscriber.entity';
import { NewsletterTokenService } from '../../newsletter-subscribers/newsletter-token.service';
import { TagsService } from '../../tags/tags.service';
import { ToursService } from '../../tours/tours.service';
import { LocalDevSeedRunner } from './local-dev-seed.runner';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
  });

  try {
    const dataSource = app.get(DataSource);
    const runner = new LocalDevSeedRunner({
      dataSource,
      languagesRepository: dataSource.getRepository(LanguageEntity),
      adminUsersRepository: dataSource.getRepository(AdminUserEntity),
      mediaAssetsRepository: dataSource.getRepository(MediaAssetEntity),
      newsletterSubscribersRepository:
        dataSource.getRepository(NewsletterSubscriberEntity),
      tagsService: app.get(TagsService),
      toursService: app.get(ToursService),
      blogPostsService: app.get(BlogPostsService),
      newsletterTokenService: app.get(NewsletterTokenService),
    });

    const summary = await runner.run();

    Logger.log(
      `Local dev seed completed: ${summary.tags} tags, ${summary.tours} tours, ${summary.blogPosts} blog posts, ${summary.newsletterSubscribers} newsletter subscribers.`,
      'LocalDevSeed',
    );
    Logger.log(
      `Seeded admin email: ${summary.adminEmail} (Auth0 login must use this email on first login).`,
      'LocalDevSeed',
    );
    Logger.log(
      `Sample newsletter tokens: pending confirmation=${summary.pendingConfirmationToken}, active unsubscribe=${summary.activeUnsubscribeToken}, unsubscribed=${summary.unsubscribedToken}.`,
      'LocalDevSeed',
    );
  } finally {
    await app.close();
  }
}

void bootstrap();
