import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { AdminListToursDto, PublicListToursDto } from './list-tours.dto';

describe('ListToursDto', () => {
  it('parses comma-separated admin filter query params', async () => {
    const dto = plainToInstance(AdminListToursDto, {
      tagKeys: 'history,architecture',
      tourTypes: 'company,group',
    });

    const errors = await validate(dto);

    expect(errors).toEqual([]);
    expect(dto.tagKeys).toEqual(['history', 'architecture']);
    expect(dto.tourTypes).toEqual(['company', 'group']);
  });

  it('parses repeated public filter query params', async () => {
    const dto = plainToInstance(PublicListToursDto, {
      locale: 'en',
      tagKeys: ['history', 'architecture'],
      tourTypes: ['company', 'group'],
    });

    const errors = await validate(dto);

    expect(errors).toEqual([]);
    expect(dto.locale).toBe('en');
    expect(dto.tagKeys).toEqual(['history', 'architecture']);
    expect(dto.tourTypes).toEqual(['company', 'group']);
  });
});
