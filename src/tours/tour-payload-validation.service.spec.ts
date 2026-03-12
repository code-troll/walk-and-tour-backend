import { BadRequestException } from '@nestjs/common';

import { TourPayloadValidationService } from './tour-payload-validation.service';

describe('TourPayloadValidationService', () => {
  let service: TourPayloadValidationService;

  beforeEach(() => {
    service = new TourPayloadValidationService();
  });

  it('accepts payloads that satisfy the schema', () => {
    expect(() =>
      service.validateOrThrow(
        {
          type: 'object',
          properties: {
            title: { type: 'string' },
          },
          required: ['title'],
        },
        {
          title: 'Historic Center Tour',
        },
      ),
    ).not.toThrow();
  });

  it('rejects payloads that do not satisfy the schema', () => {
    expect(() =>
      service.validateOrThrow(
        {
          type: 'object',
          properties: {
            title: { type: 'string' },
          },
          required: ['title'],
        },
        {},
      ),
    ).toThrow(BadRequestException);
  });
});
