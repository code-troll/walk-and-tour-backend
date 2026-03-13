import 'reflect-metadata';

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';
import { getAppConfig } from './shared/config/app.config';
import { SWAGGER_EXTRA_MODELS } from './swagger/swagger.models';

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

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Walk and Tour Backend API')
    .setDescription(
      'Administrative and public API surface for languages, tags, tours, blog posts, and admin authentication.',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Auth0-issued bearer token required by protected admin endpoints.',
      },
      'admin-auth',
    )
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig, {
    deepScanRoutes: true,
    extraModels: SWAGGER_EXTRA_MODELS,
  });

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
