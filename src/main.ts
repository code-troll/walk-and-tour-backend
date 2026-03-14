import 'reflect-metadata';

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';
import { getAppConfig } from './shared/config/app.config';
import { createSwaggerDocument } from './swagger/swagger-document';

async function bootstrap(): Promise<void> {
  const config = getAppConfig();
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  if (config.corsAllowedOrigins.length > 0) {
    app.enableCors({
      origin: config.corsAllowedOrigins,
      credentials: true,
    });
  }
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  const swaggerDocument = createSwaggerDocument(app);

  SwaggerModule.setup('api/docs', app, swaggerDocument, {
    jsonDocumentUrl: 'api/docs-json',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  await app.listen(config.port);

  Logger.log(
    `${config.appName} listening on http://localhost:${config.port}/api`,
    'Bootstrap',
  );
  Logger.log(
    `Swagger documentation available at http://localhost:${config.port}/api/docs`,
    'Bootstrap',
  );
}

void bootstrap();
