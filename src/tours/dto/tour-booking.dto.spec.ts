import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { TourBookingDto } from './create-tour.dto';

describe('TourBookingDto', () => {
  it('accepts a provider with the widget enabled', async () => {
    const errors = await validate(
      plainToInstance(TourBookingDto, { provider: 'turitop', enabled: true }),
    );

    expect(errors).toEqual([]);
  });

  it('accepts a null provider, which removes it', async () => {
    const errors = await validate(plainToInstance(TourBookingDto, { provider: null }));

    expect(errors).toEqual([]);
  });

  it('accepts Understory with its settings', async () => {
    const errors = await validate(
      plainToInstance(TourBookingDto, {
        provider: 'understory',
        enabled: true,
        settings: { companyId: 'company-1', storefrontId: 'storefront-1' },
      }),
    );

    expect(errors).toEqual([]);
  });

  it('rejects settings that are not an object', async () => {
    const errors = await validate(plainToInstance(TourBookingDto, { settings: 'company-1' }));

    expect(errors.map((error) => error.property)).toEqual(['settings']);
  });

  it('rejects a provider it does not know', async () => {
    const errors = await validate(plainToInstance(TourBookingDto, { provider: 'bokun' }));

    expect(errors.map((error) => error.property)).toEqual(['provider']);
  });

  it('rejects an enabled flag that is not a boolean', async () => {
    const errors = await validate(plainToInstance(TourBookingDto, { enabled: 'yes' }));

    expect(errors.map((error) => error.property)).toEqual(['enabled']);
  });
});
