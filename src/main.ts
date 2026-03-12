import 'reflect-metadata';

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { getAppConfig } from './shared/config/app.config';

async function bootstrap(): Promise<void> {
  const config = getAppConfig();
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  await app.listen(config.port);

  Logger.log(
    `${config.appName} listening on http://localhost:${config.port}/api`,
    'Bootstrap',
  );
}

void bootstrap();
