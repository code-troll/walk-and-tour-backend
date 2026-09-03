import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

import { CreateHotelDto, normalizeCvr } from './create-hotel.dto';

const validate = (payload: Record<string, unknown>) =>
  validateSync(plainToInstance(CreateHotelDto, payload), {
    whitelist: true,
    forbidNonWhitelisted: true,
  });

const basePayload = {
  name: 'Copenhagen Admiral Hotel',
  address: 'Toldbodgade 24-28',
  phone: '+45 33 74 14 14',
  email: 'reception@example.com',
  cvr: '12345678',
};

describe('normalizeCvr', () => {
  it.each([
    ['12345678', '12345678'],
    ['12 34 56 78', '12345678'],
    ['DK12345678', '12345678'],
    ['dk 12 34 56 78', '12345678'],
  ])('reduces %p to %p', (input, expected) => {
    expect(normalizeCvr(input)).toBe(expected);
  });

  it('leaves a non-string value alone so validation can reject it', () => {
    expect(normalizeCvr(12345678)).toBe(12345678);
  });
});

describe('CreateHotelDto', () => {
  it('accepts a hand-written CVR number and stores the eight digits', () => {
    const dto = plainToInstance(CreateHotelDto, { ...basePayload, cvr: 'DK 12 34 56 78' });

    expect(validateSync(dto)).toHaveLength(0);
    expect(dto.cvr).toBe('12345678');
  });

  it.each([
    ['1234567', 'seven digits'],
    ['123456789', 'nine digits'],
    ['1234-5678', 'a separator that is not a space'],
    ['ABCDEFGH', 'letters'],
  ])('rejects %p (%s)', (cvr) => {
    const errors = validate({ ...basePayload, cvr });

    expect(errors.map((error) => error.property)).toContain('cvr');
  });

  it('rejects a telephone number that is not dialable', () => {
    const errors = validate({ ...basePayload, phone: 'call reception' });

    expect(errors.map((error) => error.property)).toContain('phone');
  });

  it('rejects unknown fields so a typo cannot be silently dropped', () => {
    const errors = validate({ ...basePayload, tourIds: ['tour-1'] });

    expect(errors.map((error) => error.property)).toContain('tourIds');
  });
});
