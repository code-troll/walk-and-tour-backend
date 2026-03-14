import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';

import { SWAGGER_EXTRA_MODELS } from './swagger.models';

export function createSwaggerDocument(app: INestApplication): OpenAPIObject {
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

  return SwaggerModule.createDocument(app, swaggerConfig, {
    deepScanRoutes: true,
    extraModels: SWAGGER_EXTRA_MODELS,
  });
}
