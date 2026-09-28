import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { PriceDto } from './create-tour.dto';

describe('PriceDto', () => {
  it('accepts a price without a basis', async () => {
    const errors = await validate(plainToInstance(PriceDto, { amount: 250, currency: 'DKK' }));

    expect(errors).toEqual([]);
  });

  it.each(['per_person', 'per_group'])('accepts the %s basis', async (basis) => {
    const errors = await validate(
      plainToInstance(PriceDto, { amount: 1500, currency: 'DKK', basis }),
    );

    expect(errors).toEqual([]);
  });

  it('rejects a basis it does not know', async () => {
    const errors = await validate(
      plainToInstance(PriceDto, { amount: 1500, currency: 'DKK', basis: 'group' }),
    );

    expect(errors.map((error) => error.property)).toEqual(['basis']);
  });
});
