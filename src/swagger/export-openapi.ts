import 'reflect-metadata';

import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { NestFactory } from '@nestjs/core';

import { createSwaggerDocument } from './swagger-document';
import { OpenApiExportModule } from './openapi-export.module';

type JsYaml = {
  dump: (
    value: unknown,
    options?: {
      noRefs?: boolean;
      lineWidth?: number;
      quotingType?: '"' | "'";
    },
  ) => string;
};

// `js-yaml` is already installed transitively in this workspace and is only used
// by the local export script, so a typed require keeps runtime setup minimal.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const yaml = require('js-yaml') as JsYaml;

async function exportOpenApi(): Promise<void> {
  const app = await NestFactory.create(OpenApiExportModule, {
    abortOnError: false,
    logger: false,
  });

  app.setGlobalPrefix('api');

  try {
    const document = createSwaggerDocument(app);
    const outputPath = join(process.cwd(), 'docs', 'backend.yaml');
    const serialized = yaml.dump(document, {
      noRefs: true,
      lineWidth: 120,
      quotingType: '"',
    });

    await writeFile(outputPath, serialized, 'utf8');
  } finally {
    await app.close();
  }
}

void exportOpenApi().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
