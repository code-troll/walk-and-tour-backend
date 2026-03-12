import { BadRequestException } from '@nestjs/common';

import { TourSchemaPolicyService } from './tour-schema-policy.service';

describe('TourSchemaPolicyService', () => {
  let service: TourSchemaPolicyService;

  beforeEach(() => {
    service = new TourSchemaPolicyService();
  });

  it('accepts schemas within the supported v1 subset', () => {
    const schema = {
      type: 'object',
      properties: {
        title: { type: 'string' },
        highlights: {
          type: 'array',
          items: { type: 'string' },
        },
      },
      required: ['title'],
      additionalProperties: false,
    };

    expect(service.validateOrThrow(schema)).toEqual(schema);
  });

  it('rejects unsupported schema keys', () => {
    expect(() =>
      service.validateOrThrow({
        type: 'object',
        unsupportedFeature: true,
      }),
    ).toThrow(BadRequestException);
  });

  it('creates a draft schema without required fields recursively', () => {
    const draftSchema = service.createDraftSchema({
      type: 'object',
      required: ['title'],
      properties: {
        nested: {
          type: 'object',
          required: ['description'],
          properties: {
            description: { type: 'string' },
          },
        },
      },
    });

    expect(draftSchema).toEqual({
      type: 'object',
      properties: {
        nested: {
          type: 'object',
          properties: {
            description: { type: 'string' },
          },
        },
      },
    });
  });
});
