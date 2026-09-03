import {
  buildHotelUsernameCandidate,
  HOTEL_USERNAME_MAX_LENGTH,
  resolveHotelUsername,
  toHotelUsernameStem,
} from './hotel-username';

describe('toHotelUsernameStem', () => {
  it.each([
    ['Copenhagen Admiral Hotel', 'copenhagen-admiral-hotel'],
    ['  Spaced   Out  Hotel  ', 'spaced-out-hotel'],
    ['Hotel 42', 'hotel-42'],
    ["D'Angleterre & Co.", 'd-angleterre-co'],
  ])('reduces %p to %p', (input, expected) => {
    expect(toHotelUsernameStem(input)).toBe(expected);
  });

  it.each([
    ['Hotel Søborg', 'hotel-soeborg'],
    ['Hotel Ærø', 'hotel-aeroe'],
    ['Hotel Århus', 'hotel-aarhus'],
    ['HOTEL ØSTERBRO', 'hotel-oesterbro'],
  ])('transliterates Danish letters: %p becomes %p', (input, expected) => {
    expect(toHotelUsernameStem(input)).toBe(expected);
  });

  it('keeps Danish spellings apart from their stripped lookalikes', () => {
    expect(toHotelUsernameStem('Hotel Søborg')).not.toBe(
      toHotelUsernameStem('Hotel Soborg'),
    );
  });

  it('strips accents that have no Danish convention', () => {
    expect(toHotelUsernameStem('Hôtel Café')).toBe('hotel-cafe');
  });

  it('never exceeds the length cap and does not end on a separator', () => {
    const stem = toHotelUsernameStem(
      'The Extraordinarily Long Copenhagen Waterfront Palace Hotel And Spa',
    );

    expect(stem.length).toBeLessThanOrEqual(HOTEL_USERNAME_MAX_LENGTH);
    expect(stem.endsWith('-')).toBe(false);
  });

  it.each([['Æ'], ['...'], ['   '], ['日本語']])(
    'falls back for %p, which leaves nothing usable',
    (input) => {
      expect(toHotelUsernameStem(input)).toBe('hotel');
    },
  );
});

describe('buildHotelUsernameCandidate', () => {
  it('returns the bare stem for the first attempt', () => {
    expect(buildHotelUsernameCandidate('admiral', 0)).toBe('admiral');
  });

  it('numbers later attempts from two', () => {
    expect(buildHotelUsernameCandidate('admiral', 1)).toBe('admiral-2');
    expect(buildHotelUsernameCandidate('admiral', 2)).toBe('admiral-3');
  });

  it('trims the stem so the suffix fits inside the cap', () => {
    const stem = 'a'.repeat(HOTEL_USERNAME_MAX_LENGTH);
    const candidate = buildHotelUsernameCandidate(stem, 1);

    expect(candidate.length).toBe(HOTEL_USERNAME_MAX_LENGTH);
    expect(candidate.endsWith('-2')).toBe(true);
  });
});

describe('resolveHotelUsername', () => {
  it('uses the plain stem when it is free', async () => {
    await expect(
      resolveHotelUsername({
        hotelName: 'Copenhagen Admiral Hotel',
        isTaken: async () => false,
      }),
    ).resolves.toBe('copenhagen-admiral-hotel');
  });

  it('walks past taken usernames', async () => {
    const taken = new Set(['hotel-soeborg', 'hotel-soeborg-2']);

    await expect(
      resolveHotelUsername({
        hotelName: 'Hotel Søborg',
        isTaken: async (candidate) => taken.has(candidate),
      }),
    ).resolves.toBe('hotel-soeborg-3');
  });

  it('gives up rather than looping forever when everything is taken', async () => {
    await expect(
      resolveHotelUsername({
        hotelName: 'Busy Hotel',
        isTaken: async () => true,
        maxAttempts: 3,
      }),
    ).rejects.toThrow(/after 3 attempts/);
  });
});
